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
  uploadEssayNew,
  makeFileFromFeedback
} from '../controllers/grader.controller';
import 'dotenv/config';
import path from 'path';

const router = express.Router();

/**
 * A POST route to setup Assistant for an essay given a file
 */
const upload = multer({ dest: 'uploads/' });
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// Set up storage location and filenames
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'uploads/') // 'uploads/' is the directory where files will be saved
//     },
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
//     }
//   });

// const upload = multer({ storage: storage });
router.post(
  '/upload-essay',
  (req, res, next) => {
      upload.array('files', 10)(req, res, function (err) { // 'files' is the field name, 10 is the max number of files
          if (err) {
              // handle Multer error
              console.log('Error uploading files');
              return res.status(500).json({ error: err.message });
          }
          next();
      });
  },
  makeAssistantWithFile,
);

router.post(
  '/upload-essay-new',
  (req, res, next) => {
      upload.array('files', 10)(req, res, function (err) { // 'files' is the field name, 10 is the max number of files
          if (err) {
              // handle Multer error
              console.log('Error uploading files');
              return res.status(500).json({ error: err.message });
          }
          next();
      });
  },
  uploadEssayNew,
);

/**
 * A GET route to get file given an array of Essay Objects
 */
// const upload = multer({ dest: 'uploads/' });
router.get('/make-file', makeFileFromFeedback);

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
