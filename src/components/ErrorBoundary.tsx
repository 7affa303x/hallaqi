/**
 * Hallaqi - Error Boundary
 * Production-grade error handling with user-friendly fallbacks
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { reportClientError } from '@/lib/error-reporting';
import BrandLogo from '@/components/BrandLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    reportClientError(error, { componentStack: errorInfo.componentStack || undefined });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F0FDFA' }}>
          <div className="max-w-sm w-full text-center">
            <BrandLogo variant="icon" className="w-16 h-16 mx-auto mb-4 opacity-70" />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#134E4A' }}>حدث خطأ غير متوقع</h2>
            <p className="text-sm mb-4" style={{ color: '#5E7C7A' }}>
              نعتذر عن الإزعاج. يمكنك تحديث الصفحة أو العودة للرئيسية.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#0F766E' }}
              >
                تحديث الصفحة
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-xl text-sm font-bold border"
                style={{ borderColor: '#CCFBF1', color: '#0F766E', backgroundColor: '#fff' }}
              >
                الرئيسية
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs cursor-pointer" style={{ color: '#5E7C7A' }}>تفاصيل الخطأ</summary>
                <pre className="mt-2 p-2 rounded-lg text-[10px] overflow-auto" style={{ backgroundColor: '#f5f5f5', color: '#ef4444', maxHeight: '200px' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
