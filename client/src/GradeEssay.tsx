// Grader Frontend (Single Essay)

import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import axios from 'axios';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import {
  Typography,
  Grid,
  Box,
  Divider,
  Icon,
  IconButton,
  colors,
} from '@mui/material';
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
import COLORS from './assets/colors';
import { DeleteOutlined } from '@material-ui/icons';
import { Clear } from '@material-ui/icons';

const BACKENDURL = process.env.PUBLIC_URL
  ? 'https://ai-ta-backend.onrender.com'
  : 'http://localhost:4000';

const URLPREFIX = `${BACKENDURL}/api`;

type EssayObject = {
  name: string; // Student name
  classGrade: string; // Grade
  criteria: string; // Criteria
  file: File | null; // File
  fileContent: string; // File content (will contain just the filename if we have not yet extracted the text)
  feedback: string; // Feedback
};

type EssayResponse = {
  index: number;
  obj: EssayObject;
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
  const [rows, setRows] = useState<EssayObject[]>([]); // Used to display data for each row
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

  const postEssays = async () => {
    // First make sure that all rows have files
    if (!rows || rows.length < 1) return;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i].file) {
        alert('Oops! You forgot to upload a file for row' + (i + 1));
        return;
      }
    }

    // Iterate through files, and push the ones that haven't already been uploaded
    const formData = new FormData();
    formData.append('numFiles', rows.length.toString());
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (r.file && !uploadedFiles.includes(r.file!)) {
        console.log(r.file);
        setUploadedFiles((prev) => [...prev, r.file!]);

        formData.append('files', r.file!);
        formData.append('grade', r.classGrade);
        formData.append('name', r.name);
        formData.append('criteria', r.criteria);
        formData.append('feedback', r.feedback);
        formData.append('index', i.toString());
      }
    }
    setLoading(true);
    try {
      const response = await fetch(`${URLPREFIX}/grader/upload-essay-new`, {
        method: 'POST',
        body: formData,
      });

      if (response.body) {
        await processStream(response.body, (data: EssayResponse) => {
          if (loading) setLoading(false);
          console.log(data);
          const i = data.index;
          const newRows = [...rows];
          newRows[i] = data.obj;
          setRows(newRows);
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setLoading(false);
  };

  const handleFileChange = (event: any) => {
    // Update file for row object that was selected
  };

  return (
    <Box
      // margin="10px 20px 10px 20px"
      display="flex" // Ensure it's a flex container
      flexDirection="column" // Assuming you want a column layout
      alignItems="flex-start" // Align items to the start of cross axis
      overflow="fixed"
      height="100vh" // Set the height to full viewport height
    >
      {/* <Typography variant="h2">Essay Grader</Typography> */}

      {/* Top Tool Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0, // Adjust this value as needed
          zIndex: 1000, // Ensure it's above other elements
          backgroundColor: COLORS.white, // Or any other background
          // boxShadow: '0px 2px 4px rgba(0,0,0,0.1)', // Optional, for better visibility
          width: '100%',
          padding: '20px 10px 10px 10px',
        }}
      >
        {/* Hidden file input */}
        <input
          type="file"
          id="file-upload"
          style={{ display: 'none' }}
          onChange={(event) => {
            // Create a new row object for each file
            if (event.target.files && event.target.files.length > 0) {
              const newRows = [...rows];
              for (let i = 0; i < event.target.files.length; i++) {
                const newFile = event.target.files[i];
                newRows.push({
                  name: '',
                  classGrade: grade,
                  criteria: criteria,
                  file: newFile,
                  fileContent: newFile.name,
                  feedback: '',
                });
              }
              setRows(newRows);
            }
          }}
          accept=".docx,.txt,.pdf"
          multiple
        />
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          style={{ width: '100%', margin: 0 }}
        >
          <Grid item xs={12} sm={3} md={3} style={{ padding: '0 8px' }}>
            <TextField
              fullWidth
              label="Class Grade"
              variant="outlined"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5} md={6} style={{ padding: '0 8px' }}>
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
          <Grid item xs={12} sm={4} md={3} style={{ padding: '0 8px' }}>
            <PrimaryButton
              fullWidth
              variant="contained"
              onClick={() => document.getElementById('file-upload')?.click()}
              style={{ height: '100%' }}
            >
              Upload Essays
            </PrimaryButton>
          </Grid>
        </Grid>
      </Box>

      {/* Row Item (for a single essay), iterate through row objects and display*/}
      {rows.map((row, index) => (
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          style={{
            width: '100%',
            margin: '10px 0px 10px 0px',
            padding: '0px 20px 0px 20px',
          }}
        >
          <input
            type="file"
            id={`file-upload-${index}`}
            style={{ display: 'none' }}
            onChange={(event) => {
              // Update file for row object that was selected
              if (event.target.files && event.target.files.length > 0) {
                const newRows = [...rows];
                newRows[index].file = event.target.files[0];
                newRows[index].fileContent = event.target.files[0].name;
                setRows(newRows);
              }
            }}
            accept=".docx,.txt,.pdf"
            multiple
          />
          <Grid item xs={2} style={{ padding: '0 8px' }}>
            <TextField
              fullWidth
              label="Student Name"
              variant="outlined"
              value={rows[index].name}
              onChange={(e) => {
                const newRows = [...rows];
                newRows[index].name = e.target.value;
                setRows(newRows);
              }}
            />
          </Grid>
          <Grid item xs={3} style={{ padding: '0 8px' }}>
            <TextField
              fullWidth
              label="Submitted File"
              variant="outlined"
              value={rows[index].fileContent}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
          <Grid item xs={4} style={{ padding: '0 8px' }}>
            <TextField
              fullWidth
              label="Feedback"
              variant="outlined"
              value={rows[index].feedback}
              onChange={(e) => {
                const newRows = [...rows];
                newRows[index].feedback = e.target.value;
                setRows(newRows);
              }}
            />
          </Grid>
          <Grid item xs={2} style={{ padding: '0 8px' }}>
            <PrimaryButton
              fullWidth
              variant="contained"
              onClick={() => {
                document.getElementById(`file-upload-${index}`)?.click();
              }}
              style={{
                height: '100%',
                color: COLORS.white,
                backgroundColor: COLORS.primaryDark,
              }}
            >
              Change File
            </PrimaryButton>
          </Grid>
          {/* X button to delete this row entry */}
          <Grid item style={{ padding: '0 0px' }}>
            <IconButton
              onClick={() => {
                const newRows = [...rows];
                newRows.splice(index, 1);
                setRows(newRows);
              }}
            >
              {/* <CloseIcon /> */}
              {/* <DeleteOutlined style={{ color: COLORS.primaryDark }}/> */}
              <Clear style={{ color: COLORS.primaryDark }} />
            </IconButton>
          </Grid>
        </Grid>
      ))}

      {/* Button to Add a Single Essay */}
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={{ width: '100%', padding: '10px 10px 10px 10px' }}
      >
        <Grid
          item
          xs={12}
          style={{
            padding: '0 8px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PrimaryButton
            // fullWidth
            variant="contained"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  name: '',
                  classGrade: grade,
                  criteria: criteria,
                  file: null,
                  fileContent: '',
                  feedback: '',
                },
              ])
            }
            style={{
              height: '100%',
              color: COLORS.white,
              backgroundColor: COLORS.primaryDark,
            }}
          >
            Add a Single Essay
          </PrimaryButton>
        </Grid>
      </Grid>

      {/* Spacer */}
      <Box flexGrow={1}></Box>

      {/* Submit and Download Buttons */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0, // Adjust this value as needed
          zIndex: 1000, // Ensure it's above other elements
          backgroundColor: 'white', // Or any other background
          boxShadow: '0px 2px 4px rgba(0,0,0,0.1)', // Optional, for better visibility
          width: '100%',
          padding: '0px 10px 0px 10px',
        }}
      >
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          style={{ width: '100%', margin: '10px 0px 10px 0px' }}
        >
          <Grid item xs={12} style={{ padding: '0 8px', display: 'flex', justifyContent: 'center' }}>
            {loading ? (
              <CircularProgress size={50} />
            ) : (
              <PrimaryButton
                fullWidth
                variant="contained"
                onClick={() => postEssays()}
                style={{ height: '100%' }}
              >
                Submit and Get Feedback
              </PrimaryButton>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default GradeEssay;
