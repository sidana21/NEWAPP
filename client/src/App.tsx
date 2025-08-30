import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { Router, Route, Switch } from 'wouter';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="bizchat-theme">
        <Router>
          <div className="min-h-screen bg-background">
            <Switch>
              <Route path="/" component={LoginPage} />
              <Route path="/chat" component={ChatPage} />
              <Route>
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-4">
                      الصفحة غير موجودة
                    </h1>
                    <p className="text-muted-foreground">
                      عذراً، الصفحة التي تبحث عنها غير موجودة
                    </p>
                  </div>
                </div>
              </Route>
            </Switch>
          </div>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;