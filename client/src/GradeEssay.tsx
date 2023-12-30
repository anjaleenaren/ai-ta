// Grader Frontend (Single Essay)

import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { Typography, Grid } from '@mui/material';
import { useAppDispatch, useAppSelector } from './util/redux/hooks';
import {
  logout as logoutAction,
  toggleAdmin,
  selectUser,
} from './util/redux/userSlice';
import ScreenGrid from './components/ScreenGrid';
import PrimaryButton from './components/buttons/PrimaryButton';
import TextField from '@mui/material/TextField';

function GradeEssay() {
  const [feedback, setFeedback] = React.useState('');
  const [grade, setGrade] = React.useState(0);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleFileChange = (event : any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = () => {
    document.getElementById('file-upload')?.click();
  };


  return (
    <ScreenGrid>
    {/* Hidden file input */}
      <input
        type="file"
        id="file-upload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".docx,.txt"
      />

      {/* Button to trigger file upload */}
      <Grid item container justifyContent="center">
        <PrimaryButton variant="contained" onClick={uploadFile}>
          Upload an Essay (.docx, .txt)
        </PrimaryButton>
      </Grid>

      {/* Display the selected file */}
      {selectedFile && (
        <Grid item container justifyContent="center" style={{ marginTop: 20 }}>
          <Typography variant="body1">Selected File: {selectedFile.name}</Typography>
        </Grid>
      )}

      {/* Passes it to openAI to get feedback and grade */}
      <Grid marginTop="20px" item container width="100%" justifyContent="center">
        <TextField
          id="outlined-multiline-flexible"
          label="Feedback"
          multiline
          // rowsMax={4}
          value={feedback}
          onChange={(event) => {
            setFeedback(event.target.value);
          }}
          variant="outlined"
        />
      </Grid>

      {/* Displays the feedback and grade */}
    </ScreenGrid>
  );
}

export default GradeEssay;
