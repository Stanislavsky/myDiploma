import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Box,
    TextField,
    Button,
    Chip,
    Tooltip,
    CircularProgress
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Add as AddIcon,
    Person as PersonIcon,
    MedicalServices as MedicalIcon
} from '@mui/icons-material';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';
import styles from './PatientsTable.module.css';
import PatientDetails from './PatientDetails';

const PatientsTable = ({ onAddPatient, onEditPatient, onSave }) => {
    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const navigate = useNavigate();

    const fetchPatients = async () => {
        try {
            const response = await api.get('/api/patients/patients/');
            setPatients(response.data);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError('Ошибка при загрузке списка пациентов');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        if (onSave) {
            onSave(fetchPatients);
        }
    }, [onSave]);

    const handleSave = () => {
        fetchPatients(); // Обновляем список после сохранения
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пациента?')) {
            try {
                await api.delete(`/api/patients/patients/${id}/delete_patient/`);
                setPatients(patients.filter(patient => patient.id !== id));
            } catch (err) {
                console.error('Error deleting patient:', err);
                alert('Ошибка при удалении пациента');
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getGenderChip = (gender) => {
        return (
            <Chip
                label={gender === 'male' ? 'Мужской' : 'Женский'}
                color={gender === 'male' ? 'primary' : 'secondary'}
                size="small"
                variant="outlined"
            />
        );
    };

    const filteredPatients = patients.filter(patient => {
        const searchLower = searchQuery.toLowerCase();
        return (
            patient.last_name.toLowerCase().includes(searchLower) ||
            patient.first_name.toLowerCase().includes(searchLower) ||
            (patient.middle_name && patient.middle_name.toLowerCase().includes(searchLower))
        );
    });

    const handleRowClick = (patient) => {
        setSelectedPatient(patient);
        setIsDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailsOpen(false);
        setSelectedPatient(null);
    };

    if (isLoading) {
        return (
            <Box className={styles.container} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box className={styles.container} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Typography color="error" variant="h6">{error}</Typography>
            </Box>
        );
    }

    return (
        <div className={styles.container}>
            <Box className={styles.header}>
                <Typography variant="h5" component="h2">
                    Список пациентов
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onAddPatient}
                    className={styles.addButton}
                    sx={{
                        backgroundColor: 'var(--primary-color)',
                        '&:hover': {
                            backgroundColor: 'var(--primary-color)',
                            transform: 'translateY(-2px)',
                            boxShadow: 'var(--shadow-md)'
                        }
                    }}
                >
                    Добавить пациента
                </Button>
            </Box>

            <TextField
                fullWidth
                variant="outlined"
                placeholder="Поиск по ФИО..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchField}
                InputProps={{
                    startAdornment: <SearchIcon className={styles.searchIcon} />
                }}
            />

            <TableContainer 
                component={Paper} 
                className={styles.tableContainer}
                sx={{
                    boxShadow: 'none',
                    backgroundColor: 'transparent',
                    '& .MuiPaper-root': {
                        boxShadow: 'none',
                        backgroundColor: 'transparent'
                    }
                }}
            >
                {filteredPatients.length === 0 ? (
                    <Typography className={styles.noData}>
                        {searchQuery ? 'Пациенты не найдены' : 'Нет данных о пациентах'}
                    </Typography>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ФИО</TableCell>
                                <TableCell>Пол</TableCell>
                                <TableCell>Дата рождения</TableCell>
                                <TableCell>Возраст</TableCell>
                                <TableCell>СНИЛС</TableCell>
                                <TableCell>Документы</TableCell>
                                <TableCell>Полис</TableCell>
                                <TableCell align="center">Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPatients.map((patient) => (
                                <React.Fragment key={patient.id}>
                                    <TableRow 
                                        hover 
                                        onClick={() => handleRowClick(patient)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <PersonIcon color="action" />
                                                <Typography>
                                                    {`${patient.last_name} ${patient.first_name} ${patient.middle_name || ''}`}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{getGenderChip(patient.gender)}</TableCell>
                                        <TableCell>{formatDate(patient.birth_date)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${patient.age} лет`}
                                                color="info"
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {patient.document?.snils ? (
                                                <Chip
                                                    label={patient.document.snils}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {patient.document?.document_type ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2">
                                                        {`${patient.document.document_type} ${patient.document.series || ''} ${patient.document.number}`}
                                                    </Typography>
                                                </Box>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {patient.policy ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <MedicalIcon color="action" fontSize="small" />
                                                    <Typography variant="body2">
                                                        {`${patient.policy.policy_type} ${patient.policy.series || ''} ${patient.policy.number}`}
                                                    </Typography>
                                                </Box>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Редактировать">
                                                <IconButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditPatient(patient);
                                                    }}
                                                    className={styles.actionButton}
                                                    size="small"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Удалить">
                                                <IconButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(patient.id);
                                                    }}
                                                    className={styles.actionButton}
                                                    size="small"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
            <PatientDetails
                open={isDetailsOpen}
                onClose={handleCloseDetails}
                patient={selectedPatient}
            />
        </div>
    );
};

export default PatientsTable; 