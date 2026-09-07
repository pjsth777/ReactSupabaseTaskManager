import { useState } from "react";
import { supabase } from "./supabase-client";

export const Auth = ({ onLogin }) => {
    const [ isSignUp, setIsSignUp ] = useState(false);
    const [ email, setEmail ] = useState("");
    const [ password, setPassword ] = useState("");
    const [ errorMessage, setErrorMessage ] = useState("");
    const [ loading, setLoading ] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setLoading(true);

        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) {
                setErrorMessage(error.message);
            } else if (data.user) {
                alert("Sign-up successful! Check your email for verification.");
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setErrorMessage(error.message);
            } else if (data.session && onLogin) {
                onLogin(data.session);
            }
        }

        setLoading(false);
    }

    return (
        <div className="auth-container">
            <h2>{ isSignUp ? "Create an account" : "Welcome Back" }</h2>
            <p className="auth-subtitle">
                {
                    isSignUp
                    ? "Sign up to start organizing your tasks"
                    : "Sign in to manage your tasks"
                }
            </p>

            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            
            <form onSubmit={handleSubmit} className="auth-form">
                
                <label htmlFor="emailInput">Email</label>
                <input 
                    id="emailInput"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label htmlFor="passwordInput">Password</label>
                <input 
                    id="passwordInput"
                    type="password"
                    placeholder="**********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {
                        loading
                        ? "Processing"
                        : isSignUp
                            ? "Sign Up"
                            : "Sign In"
                    } 
                </button>
            </form>

            <button
                type="button"
                className="btn-switch"
                onClick={() => {
                    setIsSignUp(!isSignUp);
                }}
            >
                { isSignUp 
                    ? "Already have an account? Sign In" 
                    : "Don't have an account? Sign Up" 
                }
            </button>

        </div>
    )
}