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

/**
 * Get OpenAI's grade for an essay given a file, and grading params
 */
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
        if (
          req.file &&
          req.file.buffer &&
          req.file.mimetype &&
          req.file.originalname
        ) {
            const name = req.file.originalname;
            const content = req.file.buffer;
            const type = req.file.mimetype;
            //   const key = uuidv4();
            //   putReferralFileName(id, name, key, type);
            //   await awsUpload(key, content, type);

            // make openai request ->
            // Upload a file with an "assistants" purpose
            const file = await openai.files.create({
                file: fs.createReadStream(req.file.path),
                purpose: "assistants",
            });
            
            // Add the file to the assistant
            // const assistant = await openai.beta.assistants.create({
            //     instructions: "You are a TA for a grade 8 english class. Provide feedback on the following essay.",
            //     model: "gpt-4-1106-preview",
            //     // tools: [{"type": "retrieval"}],
            //     // file_ids: [file.id]
            // });

            const thread = await openai.beta.threads.create({
                messages: [
                  {
                    "role": "user",
                    "content": "You are a TA for a grade 8 english class. Provide feedback on the following essay.",
                    "file_ids": [file.id]
                  }
                ]
              });

            const message = await openai.beta.threads.messages.create(
                thread.id,
                {
                  role: "user",
                  content: "You are a TA for a grade 8 english class. Provide feedback on the following essay.",
                  file_ids: [file.id]
                }
            );
        }
        res.status(StatusCode.OK).json('success');
      } catch (err) {
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
}

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
}

export { makeAssistantWithFile, getFeedback, submitEssayGrade };
