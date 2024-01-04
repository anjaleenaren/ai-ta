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
  styled,
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
const MyTextField = styled(TextField)({
  '& input + fieldset': {
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    color: COLORS.primaryBlue,
  },
  '& input:invalid + fieldset': {
    borderColor: 'red',
    borderWidth: 1,
  },
  '& input:valid:focus + fieldset': {
    borderLeftWidth: 4,
    padding: '4px !important', // override inline-style
  },
  InputLabelProps: {
    style: { color: COLORS.gray }, // Label text color
  },
  InputProps: {
    style: { color: COLORS.gray }, // Label text color
  },
});

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
  isFocused: boolean;
  displayFocused: boolean;
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
  const [rows, setRows] = useState<EssayObject[]>([]); // Used to display data for each row
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [grade, setGrade] = useState('');
  const [criteria, setCriteria] = useState('');
  const [isCriteriaFocused, setIsCriteriaFocused] = useState(false);
  const [doneGenerating, setDoneGenerating] = useState(false);
  // const [selectedFile, setSelectedFile] = useState<any>(null);

  const postEssays = async () => {
    // First make sure that all rows have files
    if (!rows || rows.length < 1) return;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || (!rows[i].file && !rows[i].feedback)) {
        alert('Oops! You forgot to upload a file for row' + (i + 1));
        return;
      }
    }

    // Iterate through files, and push the ones that haven't already been uploaded
    const formData = new FormData();
    formData.append('numFiles', rows.length.toString());
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (r.file && !rows[i].feedback) {
        formData.append('files', r.file!);
        formData.append('grade', r.classGrade);
        formData.append('criteria', r.criteria);
        formData.append('feedback', r.feedback);
        formData.append('index', i.toString());
        formData.append('name', r.name);
        console.log(JSON.stringify(formData.getAll('name')));
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
          setRows((currentRows) => {
            const newRows = [...currentRows];
            newRows[i] = data.obj;
            return newRows;
          });
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setLoading(false);
  };
  const postMakeFile = async () => {
    // Todo fill this in
    // 1. Take all the content from rows and pass it to the backend
    // 2. Backend will generate a file and return it
    setLoadingFile(true);
    try {
      const response = await fetch(
        `${URLPREFIX}/grader/make-file?data=${encodeURIComponent(
          JSON.stringify(rows),
        )}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'feedback.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error downloading the feedback:', error);
    }
    setLoadingFile(false);
  };
  const downloadFile = async () => {
    // Todo fill this in
    // Download File Generated by Backend
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
              setRows((currentRows) => {
                const newRows = [...currentRows];
                for (let i = 0; i < event.target.files!.length; i++) {
                  const newFile = event.target.files![i];
                  newRows.push({
                    name: '',
                    classGrade: grade,
                    criteria: criteria,
                    file: newFile,
                    fileContent: newFile.name,
                    feedback: '',
                    isFocused: false,
                    displayFocused: false,
                  });
                }
                return newRows;
              });
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
            <MyTextField
              fullWidth
              focused
              label="Class Grade"
              variant="outlined"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5} md={6} style={{ padding: '0 8px' }}>
            <MyTextField
              fullWidth
              focused
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
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].file = event.target.files![0];
                  newRows[index].fileContent = event.target.files![0].name;
                  newRows[index].feedback = '';
                  return newRows;
                });
              }
            }}
            accept=".docx,.txt,.pdf"
            multiple
          />
          <Grid item xs={2} sm={2} style={{ padding: '0 8px' }}>
            <MyTextField
              focused={rows[index].displayFocused}
              fullWidth
              label="Student Name"
              variant="outlined"
              value={rows[index].name}
              onChange={(e) => {
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].name = e.target.value;
                  return newRows;
                });
              }}
              onMouseEnter={() =>
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].displayFocused = true;
                  return newRows;
                })
              }
              onMouseLeave={() =>
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].displayFocused = false;
                  return newRows;
                })
              }
              onFocus={() =>
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].isFocused = true;
                  newRows[index].displayFocused = true;
                  return newRows;
                })
              }
              onBlur={() =>
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows[index].isFocused = false;
                  newRows[index].displayFocused = false;
                  return newRows;
                })
              }
              multiline={rows[index].isFocused}
            />
          </Grid>
          <Grid item xs={2} sm={3} style={{ padding: '0 8px' }}>
            {rows[index].file && (
              <MyTextField
                focused={rows[index].displayFocused}
                fullWidth
                label="Submitted File"
                variant="outlined"
                value={rows[index].fileContent}
                InputProps={{
                  readOnly: true,
                }}
                onMouseEnter={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].displayFocused = true;
                    return newRows;
                  })
                }
                onMouseLeave={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].displayFocused = false;
                    return newRows;
                  })
                }
                onFocus={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].isFocused = true;
                    newRows[index].displayFocused = true;
                    return newRows;
                  })
                }
                onBlur={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].isFocused = false;
                    newRows[index].displayFocused = false;
                    return newRows;
                  })
                }
                multiline={rows[index].isFocused}
              />
            )}
          </Grid>
          <Grid item xs={3} sm={4} style={{ padding: '0 8px' }}>
            {rows[index].feedback && rows[index].feedback.length > 0 && (
              <MyTextField
                focused={rows[index].displayFocused}
                fullWidth
                label="Feedback"
                variant="outlined"
                value={rows[index].feedback}
                InputProps={{
                  readOnly: true,
                }}
                onMouseEnter={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].displayFocused = true;
                    return newRows;
                  })
                }
                onMouseLeave={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].displayFocused = false;
                    return newRows;
                  })
                }
                onFocus={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].isFocused = true;
                    newRows[index].displayFocused = true;
                    return newRows;
                  })
                }
                onBlur={() =>
                  setRows((currentRows) => {
                    const newRows = [...currentRows];
                    newRows[index].isFocused = false;
                    newRows[index].displayFocused = false;
                    return newRows;
                  })
                }
                multiline={rows[index].isFocused}
              />
            )}
          </Grid>
          <Grid item xs={3} sm={2} style={{ padding: '0 8px' }}>
            <PrimaryButton
              fullWidth
              variant="contained"
              onClick={() => {
                document.getElementById(`file-upload-${index}`)?.click();
              }}
              style={{
                height: '100%',
                color: COLORS.primaryBlue,
                backgroundColor: COLORS.white,
              }}
            >
              Edit File
            </PrimaryButton>
          </Grid>
          {/* X button to delete this row entry */}
          <Grid item style={{ padding: '0 0px' }}>
            <IconButton
              onClick={() => {
                setRows((currentRows) => {
                  const newRows = [...currentRows];
                  newRows.splice(index, 1);
                  return newRows;
                });
              }}
            >
              {/* <CloseIcon /> */}
              {/* <DeleteOutlined style={{ color: COLORS.primaryDark }}/> */}
              <Clear style={{ color: COLORS.primaryBlue }} />
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
            variant="outlined"
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
                  isFocused: false,
                  displayFocused: false,
                },
              ])
            }
            style={{
              height: '100%',
              color: COLORS.primaryBlue,
              backgroundColor: COLORS.white,
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
          <Grid
            item
            xs={12}
            style={{
              padding: '0 8px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
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
          <Grid
            item
            xs={12}
            style={{
              padding: '0 8px',
              display: 'flex',
              justifyContent: 'center',
              margin: '10px 0px 0px 0px',
            }}
          >
            {loadingFile ? (
              <CircularProgress size={50} />
            ) : (
              rows &&
              rows.length > 0 &&
              rows[0].feedback?.length > 0 &&
              !doneGenerating && (
                <Grid item xs={12}>
                  <PrimaryButton
                    fullWidth
                    variant="contained"
                    onClick={() => postMakeFile()}
                    style={{ height: '100%' }}
                  >
                    Compile Feedback Into File
                  </PrimaryButton>
                </Grid>
              )
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default GradeEssay;
