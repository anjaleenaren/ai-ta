/**
 * Specifies the middleware and controller functions to call for each route
 * relating to admin users.
 */
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import {
    makeAssistantWithFile,
    getFeedback, 
    submitEssayGrade,
} from '../controllers/grader.controller';
import 'dotenv/config';

const router = express.Router();

/**
 * A POST route to setup Assistant for an essay given a file
 */
// const upload = multer({ dest: 'uploads/' });
const storage = multer.memoryStorage();
const upload = multer({ storage });
router.post('/upload-essay',  upload.single('file'), makeAssistantWithFile);

/**
 * A GET route to get feedback and grade for an givengrading params
 */
// const upload = multer({ dest: 'uploads/' });
router.get('/get-feedback', getFeedback);


/**
 * A POST route to submit an essay grade
 */
router.post('/submitEssayGrade', submitEssayGrade);

export default router;
