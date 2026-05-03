import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Deal Pipeline</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in with your email</p>
          </div>
          <Suspense fallback={<div className="h-32" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
