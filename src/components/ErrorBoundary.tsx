import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          errorMessage = `Database Error: ${parsed.operationType} operation failed. Please check your permissions.`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
          <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-50 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-8">{errorMessage}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Refresh Application
            </Button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
