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
  ? process.env.PUBLIC_URL
  : 'http://localhost:4000';

const URLPREFIX = `${BACKENDURL}/api`;

function GradeEssay() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = React.useState(``);
  const [grade, setGrade] = useState('');
  const [criteria, setCriteria] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [extractedText, setExtractedText] = useState(``);

  const [fileContentRows, setFileContentRows] = useState(10);
  const [feedbackRows, setFeedbackRows] = useState(10);

  const calculateRows = () => {
    const windowHeight = window.innerHeight;
    // Adjust these values based on your layout and preferences
    const rowsForFileContent = Math.max(
      5,
      Math.min(25, Math.floor(windowHeight / 60)),
    );
    const rowsForFeedback = Math.max(
      3,
      Math.min(20, Math.floor(windowHeight / 70)),
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

  const handleFileChange = async (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      console.log(file);

      const formData = new FormData();
      formData.append('file', file);
      console.log('grade and criteria ', grade, criteria);
      formData.append('grade', grade); // Append grade
      formData.append('criteria', criteria); // Append criteria
      setLoading(true);
      try {
        const url = 'grader/upload-essay';
        const response = await axios.post(`${URLPREFIX}/${url}`, formData, {});

        // Handle response here
        console.log(response.data);
        console.log(response.data.responseMessage[0]?.text?.value);
        setFeedback(response.data.responseMessage[0]?.text?.value);
        setExtractedText(response.data.extractedText);
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
      />

      {/* Button to trigger file upload */}
      <Grid
        item
        container
        justifyContent="space-between"
        alignItems="center"
        style={{ width: '100%', margin: 0 }}
      >
        <Grid item>
          <TextField
            label="Grade"
            variant="outlined"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </Grid>
        <Grid item>
          <TextField
            label="Specific Criteria"
            variant="outlined"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
        </Grid>
        <Grid item>
          <PrimaryButton
            variant="contained"
            onClick={uploadFile}
            style={{ height: '100%' }}
          >
            Upload Essay
          </PrimaryButton>
        </Grid>
      </Grid>

      {/* Display the selected file */}
      {selectedFile && (
        <Grid item container justifyContent="center" style={{ marginTop: 20 }}>
          <Typography variant="body1">
            Selected File: {selectedFile.name}
          </Typography>
        </Grid>
      )}

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

      {/* Displays the feedback and grade */}
    </Box>
  );
}

export default GradeEssay;
