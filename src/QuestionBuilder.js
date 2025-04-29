import React, {useState, useRef, useEffect} from 'react';
import {Button, Form, Card, Row, Col, Table} from 'react-bootstrap';
import {FaTrash, FaPlus, FaEdit, FaGripVertical} from 'react-icons/fa';
import {DragDropContext, Droppable, Draggable} from '@hello-pangea/dnd';



const QuestionBuilder = () => {
  const createForm = async () => {
    // Basic validation
    if (!formInfo.title.trim()) {
      alert('Please enter a form title');
      return;
    }
  
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
  
    // Validate all questions have content
    const emptyQuestions = questions.some(q => !q.question.trim());
    if (emptyQuestions) {
      alert('All questions must have content');
      return;
    }
  
    // Prepare the form data for submission
    const formData = {
      title: formInfo.title,
      description: formInfo.description,
      questions: questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options.filter(opt => opt.trim()), // Remove empty options
        rows: q.rows.filter(row => row.trim()) // Remove empty rows
      })),
      createdAt: new Date().toISOString()
    };
  
    try {
      // Here you would typically send to your backend API
      console.log('Form data to submit:', formData);
      
      // Mock API call (replace with actual fetch/axios call)
      const response = await submitFormToBackend(formData);
      
      alert(`Form created successfully! ID: ${response.id}`);
      // You might want to reset the form or redirect here
    } catch (error) {
      console.error('Error creating form:', error);
      alert('Failed to create form. Please try again.');
    }
  };
  
  // Mock function to simulate API call
  const submitFormToBackend = async (formData) => {
    const payload = JSON.stringify({
      title: formData.title,
      description: formData.description,
      questions: formData.questions.map(q => ({
        question: q.question,
        type: q.type,
        required: q.required,
        options: q.options,
        rows: q.rows
      }))
    });
    
    console.log("Payload size in characters:", payload.length);
    
    const response = await fetch('http://localhost:3001/api/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description,
        questions: formData.questions.map(q => ({
          question: q.question,
          type: q.type,
          required: q.required,
          options: q.options,
          rows: q.rows
        }))
      }),
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error('Failed to create form');
    }
    
    return response.json();
  };

  const [formInfo, setFormInfo] = useState({
    title: '',
    description: ''
  });

  const [questions, setQuestions] = useState([
    {
      id: '1',
      question: '',
      type: 'short',
      options: [''],
      rows: [''],
      isEditing: false,
      required: false,
    },
  ]);
  const formRef = useRef(null);

  // Close all questions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        setQuestions(questions.map((q) => ({...q, isEditing: false})));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [questions]);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);
  };

  const toggleEdit = (id) => {
    setQuestions(
      questions.map(
        (q) =>
          q.id === id
            ? {...q, isEditing: true} // Only set the clicked question to editing mode
            : {...q, isEditing: false} // All others should be in preview mode
      )
    );
  };

  const toggleRequired = (id) => {
    setQuestions(questions.map(q => 
      q.id === id ? {...q, required: !q.required} : q
    ));
  };

  const handleQuestionChange = (id, value) => {
    setQuestions(questions.map((q) => (q.id === id ? {...q, question: value} : q)));
  };

  const handleFormInfoChange = (field, value) => {
    setFormInfo(prev => ({...prev, [field]: value}));
  };


  const handleTypeChange = (id, newType) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== id) return q;

        const compatibleTypes = ['multiple', 'checkbox', 'dropdown', 'grid'];
        const isCompatibleChange = compatibleTypes.includes(q.type) && compatibleTypes.includes(newType);

        return {
          ...q,
          type: newType,
          // Retain options if switching between compatible types
          options: isCompatibleChange ? q.options : compatibleTypes.includes(newType) ? [''] : [],
          // Only keep rows if new type is grid
          rows: newType === 'grid' ? (q.type === 'grid' ? q.rows : ['']) : [],
        };
      })
    );
  };

  const handleOptionChange = (qid, idx, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              options: q.options.map((opt, i) => (i === idx ? value : opt)),
            }
          : q
      )
    );
  };

  const handleRowChange = (qid, idx, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              rows: q.rows.map((row, i) => (i === idx ? value : row)),
            }
          : q
      )
    );
  };

  const addOption = (qid) => {
    setQuestions(questions.map((q) => (q.id === qid ? {...q, options: [...q.options, '']} : q)));
  };

  const addRow = (qid) => {
    setQuestions(questions.map((q) => (q.id === qid ? {...q, rows: [...q.rows, '']} : q)));
  };

  const removeOption = (qid, idx) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              options: q.options.filter((_, i) => i !== idx),
            }
          : q
      )
    );
  };

  const removeRow = (qid, idx) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              rows: q.rows.filter((_, i) => i !== idx),
            }
          : q
      )
    );
  };

  const addQuestion = () => {
    const newId = String(questions.length > 0 ? Math.max(...questions.map((q) => parseInt(q.id))) + 1 : 1);
    setQuestions([
      ...questions,
      {
        id: newId,
        question: '',
        type: 'short',
        options: [''],
        rows: [''],
        isEditing: true,
      },
    ]);
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  return (
    <Form ref={formRef}>
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex align-items-start">
            <div style={{flex: 1}}>
              <Form.Group className="mb-3">
                <Form.Label>Form Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter form title"
                  value={formInfo.title}
                  onChange={(e) => handleFormInfoChange('title', e.target.value)}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Form Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter form description"
                  value={formInfo.description}
                  onChange={(e) => handleFormInfoChange('description', e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
        </Card.Body>
      </Card>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((q, index) => (
                <Draggable key={q.id} draggableId={q.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <Card className="mb-3" onClick={() => !q.isEditing && toggleEdit(q.id)}>
                        <Card.Body>
                          <div className="d-flex align-items-start">
                            <div className="me-2 mt-1" style={{cursor: 'grab'}} {...provided.dragHandleProps}>
                              <FaGripVertical />
                            </div>
                            <div style={{flex: 1}}>
                              {q.isEditing ? (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <Form.Label>Question {index + 1}</Form.Label>
                                    <div>
                                      
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="me-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteQuestion(q.id);
                                        }}>
                                        Delete
                                      </Button>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleEdit(q.id);
                                        }}>
                                        Preview
                                      </Button>
                                    </div>
                                  </div>

                                  <Form.Group className="mb-2">
                                    <Form.Control
                                      type="text"
                                      placeholder="Enter your question"
                                      value={q.question}
                                      onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                                    />
                                  </Form.Group>

                                  <Form.Group as={Row} className="mb-2">
                                    <Form.Label column sm={2}>
                                      Type
                                    </Form.Label>
                                    <Col sm={10}>
                                      <Form.Select
                                        value={q.type}
                                        onChange={(e) => handleTypeChange(q.id, e.target.value)}>
                                        <option value="short">Short Answer</option>
                                        <option value="paragraph">Paragraph</option>
                                        <option value="multiple">Multiple Choice</option>
                                        <option value="checkbox">Checkboxes</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="grid">Multiple Choice Grid</option>
                                        <option value="date">Date</option>
                                      </Form.Select>
                                    </Col>
                                  </Form.Group>

                                  {q.type === 'short' && (
                                    <Form.Control type="text" placeholder="Short answer text" disabled />
                                  )}

                                  {q.type === 'paragraph' && (
                                    <Form.Control as="textarea" placeholder="Long answer text" disabled rows={3} />
                                  )}

                                  {(q.type === 'multiple' || q.type === 'checkbox') && (
                                    <>
                                      {q.options.map((opt, idx) => (
                                        <Form.Group key={idx} className="mb-2 d-flex align-items-center">
                                          <Form.Check
                                            type={q.type === 'multiple' ? 'radio' : 'checkbox'}
                                            disabled
                                            className="me-2"
                                          />
                                          <Form.Control
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(q.id, idx, e.target.value)}
                                          />
                                          {q.options.length > 1 && (
                                            <Button
                                              variant="outline-danger"
                                              className="ms-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeOption(q.id, idx);
                                              }}>
                                              <FaTrash />
                                            </Button>
                                          )}
                                        </Form.Group>
                                      ))}
                                      <Button
                                        variant="outline-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addOption(q.id);
                                        }}
                                        className="mt-2">
                                        <FaPlus className="me-1" />
                                        Add Option
                                      </Button>
                                    </>
                                  )}

                                  {q.type === 'grid' && (
                                    <>
                                      <h6 className="mt-3">Rows</h6>
                                      {q.rows.map((row, idx) => (
                                        <Form.Group key={`row-${idx}`} className="mb-2 d-flex align-items-center">
                                          <Form.Control
                                            type="text"
                                            placeholder={`Question ${idx + 1}`}
                                            value={row}
                                            onChange={(e) => handleRowChange(q.id, idx, e.target.value)}
                                          />
                                          {q.rows.length > 1 && (
                                            <Button
                                              variant="outline-danger"
                                              className="ms-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeRow(q.id, idx);
                                              }}>
                                              <FaTrash />
                                            </Button>
                                          )}
                                        </Form.Group>
                                      ))}
                                      <Button
                                        variant="outline-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addRow(q.id);
                                        }}
                                        className="mt-2 mb-3">
                                        <FaPlus className="me-1" />
                                        Add Question
                                      </Button>

                                      <h6>Columns</h6>
                                      {q.options.map((opt, idx) => (
                                        <Form.Group key={`col-${idx}`} className="mb-2 d-flex align-items-center">
                                          <Form.Control
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(q.id, idx, e.target.value)}
                                          />
                                          {q.options.length > 1 && (
                                            <Button
                                              variant="outline-danger"
                                              className="ms-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeOption(q.id, idx);
                                              }}>
                                              <FaTrash />
                                            </Button>
                                          )}
                                        </Form.Group>
                                      ))}
                                      <Button
                                        variant="outline-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addOption(q.id);
                                        }}
                                        className="mt-2">
                                        <FaPlus className="me-1" />
                                        Add Option
                                      </Button>
                                    </>
                                  )}

                                  {q.type === 'dropdown' && (
                                    <>
                                      {q.options.map((opt, idx) => (
                                        <Form.Group key={idx} className="mb-2 d-flex align-items-center">
                                          <Form.Control
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(q.id, idx, e.target.value)}
                                          />
                                          {q.options.length > 1 && (
                                            <Button
                                              variant="outline-danger"
                                              className="ms-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeOption(q.id, idx);
                                              }}>
                                              <FaTrash />
                                            </Button>
                                          )}
                                        </Form.Group>
                                      ))}
                                      <Button
                                        variant="outline-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addOption(q.id);
                                        }}
                                        className="mt-2">
                                        <FaPlus className="me-1" />
                                        Add Option
                                      </Button>
                                    </>
                                  )}
                                  {q.type === 'date' && <Form.Control type="date" disabled />}
                                  <Form.Check 
                                    type="switch"
                                    id={`required-switch-${q.id}`}
                                    label={q.required ? "Required" : "Required"}
                                    checked={q.required}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleRequired(q.id);
                                    }}
                                    className="mt-3 me-2"
                                  />
                                </>
                              ) : (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5>{q.question || 'Untitled Question'}</h5>
                                    <div>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="me-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteQuestion(q.id);
                                        }}>
                                        Delete
                                      </Button>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleEdit(q.id);
                                        }}>
                                        <FaEdit className="me-1" />
                                        Edit
                                      </Button>
                                    </div>
                                  </div>

                                  {q.type === 'short' && <Form.Control type="text" placeholder="Your answer" />}

                                  {q.type === 'paragraph' && (
                                    <Form.Control as="textarea" placeholder="Your answer" rows={3} />
                                  )}

                                  {(q.type === 'multiple' || q.type === 'checkbox') && (
                                    <Form.Group>
                                      {q.options.map((opt, idx) => (
                                        <Form.Check
                                          key={idx}
                                          type={q.type === 'multiple' ? 'radio' : 'checkbox'}
                                          label={opt || `Option ${idx + 1}`}
                                          name={`question-${q.id}`}
                                          id={`question-${q.id}-option-${idx}`}
                                          className="mb-2"
                                        />
                                      ))}
                                    </Form.Group>
                                  )}

                                  {q.type === 'grid' && (
                                    <Table bordered>
                                      <thead>
                                        <tr>
                                          <th></th>
                                          {q.options.map((opt, idx) => (
                                            <th key={`col-${idx}`} className="text-center">
                                              {opt || `Option ${idx + 1}`}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {q.rows.map((row, rowIdx) => (
                                          <tr key={`row-${rowIdx}`}>
                                            <td>{row || `Question ${rowIdx + 1}`}</td>
                                            {q.options.map((_, colIdx) => (
                                              <td key={`cell-${rowIdx}-${colIdx}`} className="text-center">
                                                <Form.Check type="radio" name={`question-${q.id}-row-${rowIdx}`} />
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  )}
                                  {q.type === 'dropdown' && (
                                    <Form.Select>
                                      <option value="">Select an option</option>
                                      {q.options.map((opt, idx) => (
                                        <option key={idx} value={opt}>
                                          {opt || `Option ${idx + 1}`}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  )}
                                  {q.type === 'date' && <Form.Control type="date" />}
                                </>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="d-flex justify-content-end gap-2 mt-3">
    <Button variant="success" onClick={addQuestion}>
      Add Question
    </Button>
    <Button variant="primary" onClick={createForm}>
      Create Form
    </Button>
  </div>
    </Form>
  );
};

export default QuestionBuilder;
