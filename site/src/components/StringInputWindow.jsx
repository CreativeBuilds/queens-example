import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

function StringInputWindow() {
    const [userString, setUserString] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const { getAccessToken } = usePrivy();

    const handleSubmitString = async () => {
        if (!userString.trim()) return;
        
        setIsSubmitting(true);
        try {
            const authToken = await getAccessToken();
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
                setUserString('');
                window.close();
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

    return (
        <div className="string-input-window">
            <h3>Submit Your String</h3>
            <input
                type="text"
                value={userString}
                onChange={(e) => setUserString(e.target.value)}
                placeholder="Enter your string"
            />
            <div className="button-container">
                <button 
                    onClick={handleSubmitString}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
                <button onClick={() => window.close()}>
                    Cancel
                </button>
            </div>
            {error && (
                <p style={{ color: 'red' }}>{error}</p>
            )}
        </div>
    );
}

export default StringInputWindow; 