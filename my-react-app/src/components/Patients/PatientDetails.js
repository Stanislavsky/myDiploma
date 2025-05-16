import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Box,
    Chip,
    Divider
} from '@mui/material';
import { Person as PersonIcon, MedicalServices as MedicalIcon } from '@mui/icons-material';
import styles from './PatientDetails.module.css';

const PatientDetails = ({ open, onClose, patient }) => {
    if (!patient) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon />
                    <Typography variant="h6">
                        {`${patient.last_name} ${patient.first_name} ${patient.middle_name || ''}`}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3}>
                    {/* Основная информация */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Основная информация
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Пол
                                </Typography>
                                <Chip
                                    label={patient.gender === 'male' ? 'Мужской' : 'Женский'}
                                    color={patient.gender === 'male' ? 'primary' : 'secondary'}
                                    size="small"
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Дата рождения
                                </Typography>
                                <Typography>
                                    {formatDate(patient.birth_date)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Возраст
                                </Typography>
                                <Typography>
                                    {patient.age} лет
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Поликлиника
                                </Typography>
                                <Typography>
                                    {patient.clinic || 'Не указана'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    {/* СНИЛС */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            СНИЛС
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Номер СНИЛС
                                </Typography>
                                <Typography>
                                    {patient.document?.snils || 'Не указан'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    {/* Документы */}
                    {patient.document && (
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Документы
                            </Typography>
                            <Grid container spacing={2}>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Тип документа
                                    </Typography>
                                    <Typography>
                                        {patient.document.document_type}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Серия и номер
                                    </Typography>
                                    <Typography>
                                        {`${patient.document.series || ''} ${patient.document.number}`}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Дата выдачи
                                    </Typography>
                                    <Typography>
                                        {formatDate(patient.document.issue_date)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Кем выдан
                                    </Typography>
                                    <Typography>
                                        {patient.document.issued_by}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    {/* Адреса */}
                    {patient.address && (
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Адрес
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Адрес регистрации
                                    </Typography>
                                    <Typography>
                                        {patient.address.registration_address}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Адрес проживания
                                    </Typography>
                                    <Typography>
                                        {patient.address.residential_address}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    {/* Полис */}
                    {patient.policy && (
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <MedicalIcon />
                                    Страховой полис
                                </Box>
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Тип полиса
                                    </Typography>
                                    <Typography>
                                        {patient.policy.policy_type}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Серия и номер
                                    </Typography>
                                    <Typography>
                                        {`${patient.policy.series || ''} ${patient.policy.number}`}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        СМО
                                    </Typography>
                                    <Typography>
                                        {patient.policy.smo}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Территория страхования
                                    </Typography>
                                    <Typography>
                                        {patient.policy.insurance_area}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Дата начала действия
                                    </Typography>
                                    <Typography>
                                        {formatDate(patient.policy.issue_date)}
                                    </Typography>
                                </Grid>
                                {patient.policy.expiry_date && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="textSecondary">
                                            Дата окончания действия
                                        </Typography>
                                        <Typography>
                                            {formatDate(patient.policy.expiry_date)}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Закрыть
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PatientDetails; 