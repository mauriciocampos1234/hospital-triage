import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
    }
    return context;
};