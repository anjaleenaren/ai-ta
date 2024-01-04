// Grader Frontend (Single Essay)

import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import axios from 'axios';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { Typography, Grid, Box } from '@mui/material';
import { useAppDispatch, useAppSelector } from './util/redux/hooks';
import {
  logout as logoutAction,
  toggleAdmin,
  selectUser,
} from './util/redux/userSlice';
import ScreenGrid from './components/ScreenGrid';
import PrimaryButton from './components/buttons/PrimaryButton';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';

const BACKENDURL = process.env.PUBLIC_URL
  ? 'https://ai-ta-backend.onrender.com'
  : 'http://localhost:4000';

const URLPREFIX = `${BACKENDURL}/api`;

type EssayResponse = {
  filename: string;
  extractedText: string;
  runStatus: string;
  responseMessage: any;
};

async function processStream(
  stream: ReadableStream<Uint8Array>,
  callback: (data: EssayResponse) => void,
) {
  const reader = stream.getReader();
  let dataBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = new TextDecoder().decode(value);
    dataBuffer += chunk;

    // Assuming each JSON object is separated by a newline
    const parts = dataBuffer.split('\n');
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        const parsedObject = JSON.parse(parts[i]);
        callback(parsedObject);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }

    dataBuffer = parts[parts.length - 1];
  }
}

function GradeEssay() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pageNum, setPageNum] = useState(-1); // Display a different response on each page
  const [responses, setResponses] = useState<EssayResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = React.useState(``);
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState('');
  const [isCriteriaFocused, setIsCriteriaFocused] = useState(false);
  // const [selectedFile, setSelectedFile] = useState<any>(null);
  const [extractedText, setExtractedText] = useState(``);

  const [fileContentRows, setFileContentRows] = useState(10);
  const [feedbackRows, setFeedbackRows] = useState(10);

  const handlePageNum = (num: number) => {
    console.log(responses);
    if (num < 0) num = 0;
    if (num > responses.length - 1) num = responses.length - 1;
    setPageNum(num);
    setExtractedText(responses[num].extractedText);
    setFeedback(responses[num].responseMessage[0]?.text?.value);
  };

  const calculateRows = () => {
    const windowHeight = window.innerHeight;
    // Adjust these values based on your layout and preferences
    const rowsForFileContent = Math.max(
      3,
      Math.min(20, Math.floor(windowHeight / 75)),
    );
    const rowsForFeedback = Math.max(
      5,
      Math.min(25, Math.floor(windowHeight / 60)),
    );

    console.log(rowsForFileContent, rowsForFeedback);

    setFileContentRows(rowsForFileContent);
    setFeedbackRows(rowsForFeedback);
  };

  useEffect(() => {
    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

  useEffect(() => {
    if (responses.length == 1) {
      console.log('Got first response', responses);
      handlePageNum(0);
    }
  }, [responses]);

  const handleFileChange = async (event: any) => {
    let files: File[] = [];
    if (event.target.files && event.target.files.length > 0) {
      // Iterate through files, and push the ones that haven't already been uploaded
      for (let i = 0; i < event.target.files.length; i++) {
        const newFile = event.target.files[i];
        if (!uploadedFiles.includes(newFile)) {
          console.log(newFile);
          files.push(newFile);
          setUploadedFiles((prev) => [...prev, newFile]);
        }
      }
    }

    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      console.log('grade and criteria ', grade, criteria);
      formData.append('grade', grade); // Append grade
      formData.append('name', name); // Append student name
      formData.append('criteria', criteria); // Append criteria
      setLoading(true);
      try {
        // const url = 'grader/upload-essay';
        // const response = await axios.post(`${URLPREFIX}/${url}`, formData, {});

        // // Handle response here
        // console.log(response.data);
        // console.log(response.data.responseMessage[0]?.text?.value);
        // setFeedback(response.data.responseMessage[0]?.text?.value);
        // setExtractedText(response.data.extractedText);

        const response = await fetch(`${URLPREFIX}/grader/upload-essay`, {
          method: 'POST',
          body: formData,
        });

        if (response.body) {
          await processStream(response.body, (data: EssayResponse) => {
            if (loading) setLoading(false);
            console.log(data);
            setResponses((prev) => [...prev, data]);
          });
        }
        console.log(responses);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
      setLoading(false);
    }
  };

  const uploadFile = () => {
    document.getElementById('file-upload')?.click();
  };

  return (
    <Box
      margin="30px"
      display="flex" // Ensure it's a flex container
      flexDirection="column" // Assuming you want a column layout
      alignItems="flex-start" // Align items to the start of cross axis
      overflow="scroll"
    >
      {/* Hidden file input */}
      <input
        type="file"
        id="file-upload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".docx,.txt,.pdf"
        multiple
      />

      {/* Button to trigger file upload */}
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        style={{ width: '100%', margin: 0 }}
      >
        <Grid item xs={12} sm={6} md={3} style={{ padding: '0 8px' }}>
          <TextField
            fullWidth
            label="Class Grade"
            variant="outlined"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3} style={{ padding: '0 8px' }}>
          <TextField
            fullWidth
            label="Student Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3} style={{ padding: '0 8px' }}>
          <TextField
            fullWidth
            label="Specific Criteria"
            variant="outlined"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            onFocus={() => setIsCriteriaFocused(true)}
            onBlur={() => setIsCriteriaFocused(false)}
            multiline={isCriteriaFocused}
            maxRows={5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3} style={{ padding: '0 8px' }}>
          <PrimaryButton
            fullWidth
            variant="contained"
            onClick={uploadFile}
            style={{ height: '100%' }}
          >
            Upload Essay(s)
          </PrimaryButton>
        </Grid>
      </Grid>

      {/* Display the selected file */}
      {/* {selectedFile && (
        <Grid item container justifyContent="center" style={{ marginTop: 20 }}>
          <Typography variant="body1">
            Selected File: {selectedFile.name}
          </Typography>
        </Grid>
      )} */}

      {/* Loading button */}
      {loading && (
        <Box
          margin="50px"
          display="flex" // Set display to flex
          justifyContent="center" // Center horizontally
          alignItems="center" // Center vertically
          width="100%"
        >
          <CircularProgress size={75} />
        </Box>
      )}

      {/* File Viewer */}
      {/* {(extractedText || feedback) && } */}
      {extractedText && (
        <Grid item container justifyContent="center" style={{ marginTop: 20 }}>
          <TextField
            label="File Content"
            multiline
            rows={fileContentRows}
            variant="outlined"
            fullWidth
            value={extractedText}
            InputProps={{
              readOnly: true,
            }}
          />
        </Grid>
      )}

      {/* Passes it to openAI to get feedback and grade */}
      {feedback && (
        <Grid
          marginTop="20px"
          item
          container
          width="100%"
          justifyContent="center"
        >
          <TextField
            id="outlined-multiline-flexible"
            label="Feedback"
            multiline
            rows={feedbackRows}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            variant="outlined"
            fullWidth
          />
        </Grid>
      )}
      {/* Next Button to Switch Responses */}
      {responses.length > 1 && (
        <Grid
          item
          container
          justifyContent="space-between"
          alignItems="center"
          style={{ width: '100%', marginTop: 15 }}
        >
          <Grid item>
            <PrimaryButton
              variant="contained"
              onClick={() => handlePageNum(pageNum - 1)}
              style={{ height: '100%' }}
            >
              Previous
            </PrimaryButton>
          </Grid>
          <Grid item>
            <PrimaryButton
              variant="contained"
              onClick={() => handlePageNum(pageNum + 1)}
              style={{ height: '100%' }}
            >
              Next
            </PrimaryButton>
          </Grid>
        </Grid>
      )}

      {/* Displays the feedback and grade */}
    </Box>
  );
}

export default GradeEssay;
