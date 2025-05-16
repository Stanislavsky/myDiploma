import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import api from '../../api/api';
import styles from './PatientForm.module.css';

const PatientForm = ({ open, onClose, patient, onSave }) => {
    const [formData, setFormData] = useState({
        last_name: '',
        first_name: '',
        middle_name: '',
        gender: '',
        birth_date: null,
        document: {
            snils: '',
            document_type: '',
            series: '',
            number: '',
            issue_date: null,
            issued_by: ''
        },
        address: {
            registration_address: '',
            residential_address: ''
        },
        policy: {
            insurance_area: '',
            smo: '',
            policy_type: '',
            series: '',
            number: '',
            issue_date: null,
            expiry_date: null
        }
    });

    useEffect(() => {
        if (patient) {
            setFormData({
                ...patient,
                birth_date: patient.birth_date ? new Date(patient.birth_date) : null,
                document: {
                    ...patient.document,
                    issue_date: patient.document?.issue_date ? new Date(patient.document.issue_date) : null
                },
                policy: {
                    ...patient.policy,
                    issue_date: patient.policy?.issue_date ? new Date(patient.policy.issue_date) : null,
                    expiry_date: patient.policy?.expiry_date ? new Date(patient.policy.expiry_date) : null
                }
            });
        } else {
            setFormData({
                last_name: '',
                first_name: '',
                middle_name: '',
                gender: '',
                birth_date: null,
                document: {
                    snils: '',
                    document_type: '',
                    series: '',
                    number: '',
                    issue_date: null,
                    issued_by: ''
                },
                address: {
                    registration_address: '',
                    residential_address: ''
                },
                policy: {
                    insurance_area: '',
                    smo: '',
                    policy_type: '',
                    series: '',
                    number: '',
                    issue_date: null,
                    expiry_date: null
                }
            });
        }
    }, [patient]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDocumentChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            document: {
                ...prev.document,
                [field]: value
            }
        }));
    };

    const handleAddressChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value
            }
        }));
    };

    const handlePolicyChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            policy: {
                ...prev.policy,
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const patientData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                middle_name: formData.middle_name,
                gender: formData.gender,
                birth_date: formData.birth_date,
                document: {
                    snils: formData.document.snils,
                    document_type: formData.document.document_type,
                    series: formData.document.series,
                    number: formData.document.number,
                    issue_date: formData.document.issue_date,
                    issued_by: formData.document.issued_by
                },
                address: {
                    registration_address: formData.address.registration_address,
                    residential_address: formData.address.residential_address
                },
                policy: {
                    insurance_area: formData.policy.insurance_area,
                    smo: formData.policy.smo,
                    policy_type: formData.policy.policy_type,
                    series: formData.policy.series,
                    number: formData.policy.number,
                    issue_date: formData.policy.issue_date,
                    expiry_date: formData.policy.expiry_date
                }
            };

            // Форматируем даты в ISO строки
            if (patientData.birth_date) {
                patientData.birth_date = patientData.birth_date.toISOString().split('T')[0];
            }
            if (patientData.document.issue_date) {
                patientData.document.issue_date = patientData.document.issue_date.toISOString().split('T')[0];
            }
            if (patientData.policy.issue_date) {
                patientData.policy.issue_date = patientData.policy.issue_date.toISOString().split('T')[0];
            }
            if (patientData.policy.expiry_date) {
                patientData.policy.expiry_date = patientData.policy.expiry_date.toISOString().split('T')[0];
            }

            let response;
            if (patient) {
                // Если есть patient, значит это редактирование
                response = await api.put(`/api/patients/patients/${patient.id}/`, patientData);
            } else {
                // Если нет patient, значит это создание нового
                response = await api.post('/api/patients/patients/', patientData);
            }
            
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving patient:', error);
            alert('Ошибка при сохранении пациента: ' + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {patient ? 'Редактирование пациента' : 'Новый пациент'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={3}>
                        {/* Основная информация */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Основная информация
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Фамилия"
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Имя"
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Отчество"
                                value={formData.middle_name}
                                onChange={(e) => handleChange('middle_name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Пол</InputLabel>
                                <Select
                                    value={formData.gender}
                                    onChange={(e) => handleChange('gender', e.target.value)}
                                    label="Пол"
                                >
                                    <MenuItem value="male">Мужской</MenuItem>
                                    <MenuItem value="female">Женский</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DatePicker
                                    label="Дата рождения"
                                    value={formData.birth_date}
                                    onChange={(date) => handleChange('birth_date', date)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* Снилс */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Снилс
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="СНИЛС"
                                value={formData.document.snils}
                                onChange={(e) => handleDocumentChange('snils', e.target.value)}
                                required
                            />
                        </Grid>

                        {/* Документы */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Документы
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Тип документа"
                                value={formData.document.document_type}
                                onChange={(e) => handleDocumentChange('document_type', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Серия"
                                value={formData.document.series}
                                onChange={(e) => handleDocumentChange('series', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Номер"
                                value={formData.document.number}
                                onChange={(e) => handleDocumentChange('number', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DatePicker
                                    label="Дата выдачи"
                                    value={formData.document.issue_date}
                                    onChange={(date) => handleDocumentChange('issue_date', date)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Кем выдан"
                                value={formData.document.issued_by}
                                onChange={(e) => handleDocumentChange('issued_by', e.target.value)}
                                required
                            />
                        </Grid>

                        {/* Адреса */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Адрес
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Адрес регистрации"
                                value={formData.address.registration_address}
                                onChange={(e) => handleAddressChange('registration_address', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Адрес проживания"
                                value={formData.address.residential_address}
                                onChange={(e) => handleAddressChange('residential_address', e.target.value)}
                                required
                            />
                        </Grid>

                        {/* Полис */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Полис
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Территория страхования"
                                value={formData.policy.insurance_area}
                                onChange={(e) => handlePolicyChange('insurance_area', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="СМО"
                                value={formData.policy.smo}
                                onChange={(e) => handlePolicyChange('smo', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Тип полиса"
                                value={formData.policy.policy_type}
                                onChange={(e) => handlePolicyChange('policy_type', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Серия"
                                value={formData.policy.series}
                                onChange={(e) => handlePolicyChange('series', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Номер"
                                value={formData.policy.number}
                                onChange={(e) => handlePolicyChange('number', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DatePicker
                                    label="Дата начала действия"
                                    value={formData.policy.issue_date}
                                    onChange={(date) => handlePolicyChange('issue_date', date)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            required: true
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DatePicker
                                    label="Дата окончания действия"
                                    value={formData.policy.expiry_date}
                                    onChange={(date) => handlePolicyChange('expiry_date', date)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Отмена</Button>
                    <Button type="submit" variant="contained" color="primary">
                        {patient ? 'Сохранить' : 'Добавить'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default PatientForm;