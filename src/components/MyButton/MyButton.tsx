import { ReactNode } from 'react';
import Button from '@mui/material/Button';

interface MyButtonProps {
    onClick?: () => void;
    children?: ReactNode;
    variant?: 'text' | 'contained' | 'outlined';
}

const MyButton = ({
    onClick,
    children,
    variant = 'contained',
}: MyButtonProps) => {
    return (
        <>
            <Button onClick={onClick} variant={variant}>
                {children}
            </Button>
        </>
    );
};

export default MyButton;
