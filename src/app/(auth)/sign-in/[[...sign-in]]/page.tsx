import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Plumbr</h1>
          <p className="text-slate-500 mt-1">Your construction business, straight.</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
