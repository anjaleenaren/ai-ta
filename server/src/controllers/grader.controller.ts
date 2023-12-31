/**
 * All the controller functions containing the logic for routes relating to
 * grading (such as dealing with OpenAI, and pushing to database)
 */
import express from 'express';
import crypto from 'crypto';
import ApiError from '../util/apiError';
import StatusCode from '../util/statusCode';
import { IUser } from '../models/user.model';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import mammoth from 'mammoth';

/**
 * Get OpenAI's grade for an essay given a file, and grading params
 */
var assistant: any = 'asst_YKlxmmzbedS2zWEy7WucJvqP';

const makeAssistant = async () => {
  console.log('Make assistant');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  assistant = await openai.beta.assistants.create({
    name: 'Essay Grader',
    description:
      'You are great at grading assignments and giving feedback for students in grade school. One of your many skills include giving nuanced, detailed, relevant, and easily understandable feedback for assignments like essays, that will help students improve.',
    model: 'gpt-4-1106-preview',
  });
  console.log(assistant.id);
};

const extractTextFromTxt = (filePath : any) => {
    return fs.readFileSync(filePath, 'utf8');
  };

const extractTextFromDocx = async (filePath : any) => {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value; // The raw text
    } catch (error) {
      console.error('Error extracting text from docx:', error);
      throw error;
    }
};

const pdf = require('pdf-parse');
const extractTextFromPDF = async (filePath : any) => {
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
  console.log('Enter make assistant with file');
  const list = await openai.files.list();

  for await (const file of list) {
    console.log(file);
  }

  try {
    console.log('Enter try, file =', req.file);
    // const id = req.params.id;
    if (req.file) {
      console.log('Make assistant with file');

      // Extract text from file
      let extractedText;
      switch (req.file.mimetype) {
        case 'text/plain':
          extractedText = extractTextFromTxt(req.file.path);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedText = await extractTextFromDocx(req.file.path);
          break;
        case 'application/pdf':
          extractedText = await extractTextFromPDF(req.file.path);
          break;
        default:
          return res.status(400).send('Unsupported file type');
      }

      console.log('extracted text = ', extractedText);
      /* File Upload - Doesn't work for Threads Yet
      // make openai request ->
      // Upload a file with an "assistants" purpose
      const file = await openai.files.create({
        file: fs.createReadStream(req.file.path),
        purpose: 'assistants',
      });
      console.log('openai fileid = ', file.id);

      const file_get = await openai.files.retrieve(file.id);

      console.log(file_get);
      */

      // Add the file to the assistant
      // const assistant = await openai.beta.assistants.create({
      //     instructions: "You are a TA for a grade 8 english class. Provide feedback on the following essay.",
      //     model: "gpt-4-1106-preview",
      //     // tools: [{"type": "retrieval"}],
      //     // file_ids: [file.id]
      // });

      if (!assistant || !assistant.id) {
        // Take this out after making the first assisstant and hardcode the id
        await makeAssistant();
        console.log('made assistant');
      }
      console.log(assistant.id);

      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: 'user',
            content:
              'You are a TA for a grade 8 english class. Provide feedback on the following essay:\n' + extractedText,
            // file_ids: [file.id],
          },
        ],
      });

      var run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });
      console.log(run);
      // Wait for run.status to be completed
      while (run.status == 'queued' || run.status == 'in_progress') {
        await new Promise((r) => setTimeout(r, 500));
        run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }
      console.log('run status = ', run.status);
      const threadMessages = await openai.beta.threads.messages.list(thread.id);
      console.log(threadMessages);
      console.log('last message =', threadMessages.data[0].content);
    }
    res.status(StatusCode.OK).json('success');
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

export { makeAssistantWithFile, getFeedback, submitEssayGrade };
