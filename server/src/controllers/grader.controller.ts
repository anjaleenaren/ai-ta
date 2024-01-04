/**
 * All the controller functions containing the logic for routes relating to
 * grading (such as dealing with OpenAI, and pushing to database)
 */
import express, { response } from 'express';
import crypto from 'crypto';
import ApiError from '../util/apiError';
import StatusCode from '../util/statusCode';
import { IUser } from '../models/user.model';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import mammoth from 'mammoth';
import { hasOwn } from 'openai/core';

/**
 * Get OpenAI's grade for an essay given a file, and grading params
 */
var assistant: any = {
  id: 'asst_6ujXj7V7lLO30g8c1bzcOQ6Z',
};

type EssayObject = {
  name: string; // Student name
  classGrade: string; // Grade
  criteria: string; // Criteria
  file: Express.Multer.File | null; // File
  fileContent: string; // File content (will contain just the filename if we have not yet extracted the text)
  feedback: string; // Feedback
};

type EssayResponse = {
  index: number;
  obj: EssayObject;
  runId?: string;
};

const makeAssistant = async () => {
  console.log('Make assistant');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  assistant = await openai.beta.assistants.create({
    name: 'Essay Grader',
    description:
      "You are great at grading assignments and giving feedback for students in grade school. One of your many skills include giving nuanced, detailed, relevant, and easily understandable feedback for assignments like essays, that will help students improve. You are also skilled at giving specific feedback. For example, you often cite examples from the student's writing when giving feedback.",
    model: 'gpt-4-1106-preview',
  });
  console.log(assistant.id);
};

const extractTextFromTxt = (filePath: any) => {
  return fs.readFileSync(filePath, 'utf8');
};

const extractTextFromDocx = async (filePath: any) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value; // The raw text
  } catch (error) {
    console.error('Error extracting text from docx:', error);
    throw error;
  }
};

const pdf = require('pdf-parse');
const extractTextFromPDF = async (filePath: any) => {
  let dataBuffer = fs.readFileSync(filePath);
  try {
    let data = await pdf(dataBuffer);
    return data.text; // The text content of the PDF
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

const makeAssistantWithFile = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // const id = req.params.id;
    if (req.files) {
      console.log('Received files:', req.files);

      const grade = req.body.grade;
      const criteria = req.body.criteria;
      const name = req.body.name;
      console.log('grade = ', grade);
      console.log('criteria = ', criteria);
      console.log('name = ', name);

      if (!assistant || !assistant.id) {
        // Take this out after making the first assisstant and hardcode the id
        await makeAssistant();
        console.log('made assistant');
      }

      // Process each file
      const files = req.files as Express.Multer.File[];
      let runningRuns: any = [];
      // Associated extracted texts to runs
      let extractedTexts: any = {};
      for (const file of files) {
        // Extract text from file
        let extractedText;
        switch (file.mimetype) {
          case 'text/plain':
            extractedText = extractTextFromTxt(file.path);
            break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            extractedText = await extractTextFromDocx(file.path);
            break;
          case 'application/pdf':
            extractedText = await extractTextFromPDF(file.path);
            break;
          default:
            // return res.status(400).send('Unsupported file type');
            break;
        }
        // trim extracted text & remove leading and trailing white space
        extractedText = extractedText.trim();

        // console.log('extracted text = ', extractedText);

        console.log(assistant.id);
        var prompt = grade
          ? `You are a TA for a grade ${grade} english class. Write your feedback with a tone and style that is appropriate for a ${grade}th grader.`
          : `You are a TA for an english class.`;
        if (name) {
          prompt += ` Please address the student by their name, ${name}`;
        }
        if (criteria) {
          prompt += ` Make sure to touch on the following criteria / special instructions: ${criteria}.`;
        }
        prompt += ` Provide feedback on the following essay. Include strengths and areas for improvement. When discussing areas for improvement, reference specific examples from the student's writing. Student's essay is below: \n${extractedText}`;
        console.log('prompt = ', prompt);

        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: prompt,
              // file_ids: [file.id],
            },
          ],
        });

        var run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        runningRuns.push(run);
        // append file name to front of extractedText
        extractedText = `${file.originalname}:\n${extractedText}`;
        extractedTexts[run.id] = extractedText;
      };

      console.log('here');

      console.log('\n \n \n runningRuns = ', runningRuns);

      while (runningRuns.length > 0) {
        console.log('In while loop');
        var runList = [];
        for (const r of runningRuns) {
          const run = await openai.beta.threads.runs.retrieve(
            r.thread_id,
            r.id,
          );
          runList.push(run);
        }
        for (const r of runList) {
          console.log('run status = ', r.status, ' for thread ', r.thread_id);
          // Wait for run.status to be completed
          if (r.status != 'queued' && r.status != 'in_progress') {
            // Stream r to the frontend
            var responseObject;
            const extractedText = extractedTexts[r.id]
              ? extractedTexts[r.id]
              : '';
            if (r.status != 'completed') {
              console.log('Thread stopped running, but didnt complete');
              responseObject = {
                extractedText: extractedText,
                runStatus: r.status,
                responseMessage:
                  'Sorry, I was unable to grade this essay. Please try again.',
              };
            } else {
              const threadMessages = await openai.beta.threads.messages.list(
                r.thread_id,
              );
              responseObject = {
                extractedText: extractedText,
                runStatus: r.status,
                responseMessage: threadMessages.data[0].content,
              };
            }

            res.write(JSON.stringify(responseObject) + '\n');
            // Remove r from runList
            runningRuns = runList.filter((item) => item !== r);
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      res.end();
    }
  } catch (err) {
    console.log('Error uploading file in controller');
    console.log(err);
    next(
      ApiError.internal(
        `Unable to upload file due to the following error: ${err}`,
      ),
    );
  }
};

/**
 * Get OpenAI's feedback and grade for an essay given a file, and grading params
 */
const getFeedback = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const { email, grade } = req.body;
  if (!email || !grade) {
    next(ApiError.missingFields(['email', 'grade']));
    return;
  }
  //push to mongo
  return;
};

/**
 * Submit an essay grade
 */
const submitEssayGrade = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const { email, grade } = req.body;
  if (!email || !grade) {
    next(ApiError.missingFields(['email', 'grade']));
    return;
  }
  //push to mongo
  return;
};

const uploadEssayNew = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // const id = req.params.id;
    if (req.files) {
      const numFiles = req.files.length as number;

      if (!assistant || !assistant.id) {
        // Take this out after making the first assisstant and hardcode the id
        await makeAssistant();
        console.log('made assistant');
      }


      // Process each file
      let responseObjects: EssayResponse[] = [];
      const files = req.files as Express.Multer.File[];
      let runningRuns: any = [];
      // Associated extracted texts to runs
      let extractedTexts: any = {};

      for (let i = 0; i < numFiles; i++) {
        const file = files[i];
        const grade = req.body.grade[i];
        const criteria = req.body.criteria[i];
        const name = req.body.name[i];
        const index = req.body.index[i];
        console.log("Proccessing file for student ", name, " with index ", index, " and grade ", grade, " and criteria ", criteria);
        const responseObject: EssayResponse = {index: index, obj: {name: name, classGrade: grade, criteria: criteria, file: file, fileContent: '', feedback: ''}};

        let extractedText;
        switch (file.mimetype) {
          case 'text/plain':
            extractedText = extractTextFromTxt(file.path);
            break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            extractedText = await extractTextFromDocx(file.path);
            break;
          case 'application/pdf':
            extractedText = await extractTextFromPDF(file.path);
            break;
          default:
            // return res.status(400).send('Unsupported file type');
            break;
        }
        // trim extracted text & remove leading and trailing white space
        extractedText = extractedText.trim();

        var prompt = grade
          ? `You are a TA for a grade ${grade} english class. Write your feedback with a tone and style that is appropriate for a ${grade}th grader.`
          : `You are a TA for an english class.`;
        if (name) {
          prompt += ` Please address the student by their name, ${name}`;
        }
        if (criteria) {
          prompt += ` Make sure to touch on the following criteria / special instructions: ${criteria}.`;
        }
        prompt += ` Provide feedback on the following essay. Include strengths and areas for improvement. When discussing areas for improvement, reference specific examples from the student's writing. Student's essay is below: \n${extractedText}`;

        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: prompt,
              // file_ids: [file.id],
            },
          ],
        });

        var run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        runningRuns.push(run);
        // append file name to front of extractedText
        extractedText = `${file.originalname}:\n${extractedText}`;
        extractedTexts[run.id] = extractedText;
        responseObject.obj.fileContent = extractedText;
        responseObject.runId = run.id;
        responseObjects.push(responseObject);
      };


      while (runningRuns.length > 0) {
        var runList = [];
        for (const r of runningRuns) {
          const run = await openai.beta.threads.runs.retrieve(
            r.thread_id,
            r.id,
          );
          runList.push(run);
        }
        for (const r of runList) {
          // Wait for run.status to be completed
          if (r.status != 'queued' && r.status != 'in_progress') {
            // Stream r to the frontend
            var responseObject : EssayResponse;
            const extractedText = extractedTexts[r.id]
              ? extractedTexts[r.id]
              : '';
            if (r.status != 'completed') {
              console.log('Thread stopped running, but didnt complete');
              // Find matching response object from array
              responseObject = responseObjects.find(obj => obj.runId === r.id)!;
              responseObject.obj.feedback = 'Sorry, I was unable to grade this essay. Please try again.';
            } else {
              console.log('Thread completed for runId = ', r.id);
              const threadMessages = await openai.beta.threads.messages.list(
                r.thread_id,
              );
              // Find matching response object from array
              responseObject = responseObjects.find(obj => obj.runId === r.id)!;
              const feedbackObj= threadMessages.data[0].content[0] as OpenAI.Beta.Threads.Messages.MessageContentText;
              responseObject.obj.feedback = feedbackObj.text.value;
            }
            console.log('-----------------------------------\nResponseObject = ', responseObject, '-----------------------------------\n');
            res.write(JSON.stringify(responseObject) + '\n');
            // Remove r from runList
            runningRuns = runList.filter((item) => item !== r);
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      res.end();
    }
  } catch (err) {
    console.log('Error uploading file in controller');
    console.log(err);
    next(
      ApiError.internal(
        `Unable to upload file due to the following error: ${err}`,
      ),
    );
  }
};

export { makeAssistantWithFile, getFeedback, submitEssayGrade, uploadEssayNew };

