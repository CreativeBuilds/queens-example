import { PrivyProvider } from '@privy-io/react-auth';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthComponent from './components/AuthComponent';
import StringInputWindow from './components/StringInputWindow';

console.log('Privy App ID:', import.meta.env.VITE_PRIVY_APP_ID);

function App() {
    return (
        <PrivyProvider
            appId={import.meta.env.VITE_PRIVY_APP_ID}
            config={{
                appearance: {
                    theme: 'light',
                    accentColor: '#4CAF50',
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },
            }}
        >
            <Router>
                <Routes>
                    <Route path="/" element={<AuthComponent />} />
                    <Route path="/string-input" element={<StringInputWindow />} />
                </Routes>
            </Router>
        </PrivyProvider>
    );
}

export default App; 