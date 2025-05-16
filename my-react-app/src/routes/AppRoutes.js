import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Client from '../apps/client';
import Admin from '../apps/adminPanel/pages/AdminPanel';
import Login from '../components/Login/Login';
import MainWindow from '../components/MainWindow';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import '../index.css'

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
                <ProtectedRoute>
                    <MainWindow />
                </ProtectedRoute>
            } />
            <Route path="/patients" element={
                <ProtectedRoute>
                    <MainWindow initialTab={1} />
                </ProtectedRoute>
            } />
            <Route path="/app/*" element={
                <ProtectedRoute>
                    <Client/>
                </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
                <ProtectedRoute adminOnly={true}>
                    <Admin/>
                </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;