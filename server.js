require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;


// Middleware
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));



// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'form_builder',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// API Endpoints

// Create a new form with questions
app.post('/api/forms', async (req, res) => {
    const { title, description, questions } = req.body;
  
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Form title is required' });
    }
  
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }
  
    const connection = await pool.getConnection();
  
    try {
      await connection.beginTransaction();
  
      // 1. Insert form
      const [formResult] = await connection.query(
        'INSERT INTO Forms (Form_Name, Description) VALUES (?, ?)',
        [title.trim(), description?.trim() || null]
      );
      const formId = formResult.insertId;
  
      // 2. Insert questions
      for (const q of questions) {
        const [typeResult] = await connection.query(
          'SELECT QType_ID FROM Question_Type WHERE Question_Type = ?',
          [q.type]
        );
  
        if (typeResult.length === 0) {
          throw new Error(`Invalid question type: ${q.type}`);
        }
  
        const typeId = typeResult[0].QType_ID;
  
        const [questionResult] = await connection.query(
          'INSERT INTO Main_Questions (Form_ID, Main_Question, QType_ID, Required) VALUES (?, ?, ?, ?)',
          [formId, q.question.trim(), typeId, q.required || false]
        );
        const questionId = questionResult.insertId;
  
        // Insert options
        if (q.options && q.options.filter(opt => opt?.trim()).length > 0) {
          const choices = q.options
            .filter(opt => opt?.trim())
            .map(opt => [questionId, opt.trim()]);
  
          await connection.query(
            'INSERT INTO Choices (Main_Question_ID, Choice_Text) VALUES ?',
            [choices]
          );
        }
  
        // Insert sub-questions
        if (q.rows && q.rows.filter(row => row?.trim()).length > 0) {
          const rows = q.rows
            .filter(row => row?.trim())
            .map(row => [questionId, row.trim()]);
  
          await connection.query(
            'INSERT INTO Sub_Question (Main_Question_ID, Sub_Question) VALUES ?',
            [rows]
          );
        }
      }
  
      // ✅ Commit after all questions are processed
      await connection.commit();
      res.status(201).json({
        id: formId,
        message: 'Form created successfully'
      });
  
    } catch (error) {
        await connection.rollback();
        console.error('Database error:', error.stack); // 🔥 Full error
        res.status(500).json({ error: error.message || 'Failed to create form' });
    } finally {
      connection.release();
    }
  });
  
// Get form with questions and structure
app.get('/api/forms/:id', async (req, res) => {
  try {
    const formId = req.params.id;
    
    // Get form details
    const [forms] = await pool.query('SELECT * FROM Forms WHERE Form_ID = ?', [formId]);
    if (forms.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const form = forms[0];
    
    // Get questions with their types
    const [questions] = await pool.query(`
      SELECT mq.*, qt.Question_Type 
      FROM Main_Questions mq
      JOIN Question_Type qt ON mq.QType_ID = qt.QType_ID
      WHERE mq.Form_ID = ?
      ORDER BY mq.Main_Question_ID
    `, [formId]);
    
    // Get options and sub-questions for each question
    for (const question of questions) {
      // Get options
      const [options] = await pool.query(
        'SELECT * FROM Choices WHERE Main_Question_ID = ? ORDER BY Choice_ID',
        [question.Main_Question_ID]
      );
      question.options = options.map(opt => opt.Choice_Text);
      
      // Get sub-questions (for grid questions)
      const [subQuestions] = await pool.query(
        'SELECT * FROM Sub_Question WHERE Main_Question_ID = ? ORDER BY Sub_Question_ID',
        [question.Main_Question_ID]
      );
      question.rows = subQuestions.map(sub => sub.Sub_Question);
    }
    
    res.json({
      ...form,
      questions
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// Submit form response
app.post('/api/forms/:id/responses', async (req, res) => {
  const formId = req.params.id;
  const { studentId, answers } = req.body;
  
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers array is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create response record
    const [responseResult] = await connection.query(
      'INSERT INTO Responses (Form_ID, Student_ID) VALUES (?, ?)',
      [formId, studentId || null]
    );
    const responseId = responseResult.insertId;

    // 2. Process each answer
    for (const answer of answers) {
      const { questionId, choiceId, textAnswer, gridAnswers } = answer;
      
      // For regular questions
      if (choiceId || textAnswer) {
        await connection.query(
          'INSERT INTO Answers (Response_ID, Main_Question_ID, Choice_ID, Text_Answer) VALUES (?, ?, ?, ?)',
          [responseId, questionId, choiceId || null, textAnswer || null]
        );
      }
      
      // For grid questions
      if (gridAnswers && Array.isArray(gridAnswers)) {
        for (const gridAnswer of gridAnswers) {
          const { subQuestionId, choiceId } = gridAnswer;
          await connection.query(
            'INSERT INTO Grid_Answer (Response_id, Main_Question_ID, Sub_Question_ID, Choice_ID) VALUES (?, ?, ?, ?)',
            [responseId, questionId, subQuestionId, choiceId]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ 
      responseId,
      message: 'Response submitted successfully' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  } finally {
    connection.release();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});