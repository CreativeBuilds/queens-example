import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

function AuthComponent() {
    const { login, logout, ready, authenticated, user, getAccessToken } = usePrivy();
    const [randomNumber, setRandomNumber] = useState(null);
    const [error, setError] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [userString, setUserString] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [popupWindow, setPopupWindow] = useState(null);

    useEffect(() => {
        // Skip if already verifying or not authenticated
        if (isVerifying || !authenticated || !user) return;

        const verifyUser = async () => {
            setIsVerifying(true);
            try {
                const authToken = await getAccessToken();
                console.log("Verifying user...");
                
                const response = await fetch('/api/verify-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ authToken })
                });

                const data = await response.json();
                
                if (data.success) {
                    setRandomNumber(data.data.randomNumber);
                    setError(null);
                } else {
                    setError('Verification failed');
                }
            } catch (err) {
                setError('Error during verification');
                console.error('Verification error:', err);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyUser();
    }, [authenticated, user]); // Removed getAccessToken from dependencies

    const handleSubmitString = async () => {
        if (!userString.trim()) return;
        
        setIsSubmitting(true);
        try {
            const authToken = await getAccessToken();
            console.log("Whats my auth token?", authToken);
            const response = await fetch('/api/submit-string', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userString })
            });

            const data = await response.json();
            if (data.success) {
                setIsPopupOpen(false);
                setUserString('');
                // Optionally show success message
            } else {
                setError('Failed to submit string');
            }
        } catch (err) {
            setError('Error submitting string');
            console.error('Submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openStringInputWindow = () => {
        console.log("Opening window...");
        const width = 400;
        const height = 300;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const newWindow = window.open(
            '/string-input',
            'StringInput',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        setPopupWindow(newWindow);

        // Optional: Handle window close
        const timer = setInterval(() => {
            if (newWindow.closed) {
                clearInterval(timer);
                setPopupWindow(null);
            }
        }, 500);
    };

    if (!ready) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {!authenticated ? (
                <button onClick={login}>Login with Privy</button>
            ) : (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <p>Welcome, {user.id}!</p>
                        <button 
                            onClick={logout}
                            style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                    </div>
                    {randomNumber !== null && (
                        <p>Your verified random number: {randomNumber}</p>
                    )}
                    <button onClick={openStringInputWindow}>
                        Open String Input Window
                    </button>
                    
                    {error && (
                        <p style={{ color: 'red' }}>{error}</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AuthComponent; 