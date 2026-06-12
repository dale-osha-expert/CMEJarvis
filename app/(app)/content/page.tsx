export default function ContentPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Content Agent</h1>
      <p className="text-slate-400 text-sm mt-2">Coming soon</p>
      <div className="mt-6 bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
        <p className="text-slate-300 text-sm">The Content Agent will be able to:</p>
        <ul className="space-y-1 text-slate-400 text-sm list-disc list-inside">
          <li>Draft blog posts and landing page copy</li>
          <li>Write course descriptions and learning objectives</li>
          <li>Generate ad creative headlines and body copy variants</li>
          <li>Draft email campaigns and sequences</li>
          <li>Create meta descriptions and SEO content</li>
        </ul>
        <p className="text-slate-500 text-xs mt-4">
          Plug in: Anthropic API (same model) with a content-focused system prompt.
          Publish actions will go through the approval system.
        </p>
      </div>
    </div>
  );
}
