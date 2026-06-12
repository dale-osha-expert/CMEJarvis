export default function DevPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Dev Agent</h1>
      <p className="text-slate-400 text-sm mt-2">Coming soon</p>
      <div className="mt-6 bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
        <p className="text-slate-300 text-sm">The Dev Agent will be able to:</p>
        <ul className="space-y-1 text-slate-400 text-sm list-disc list-inside">
          <li>Open and triage GitHub issues</li>
          <li>Summarize pull request changes</li>
          <li>Monitor CI/CD pipeline status</li>
          <li>Propose code changes (via PR approval flow)</li>
          <li>Summarize changelogs and release notes</li>
        </ul>
        <p className="text-slate-500 text-xs mt-4">
          Plug in: GitHub REST API + GraphQL. All write operations (open issue, create PR)
          will require approval before executing.
        </p>
      </div>
    </div>
  );
}
