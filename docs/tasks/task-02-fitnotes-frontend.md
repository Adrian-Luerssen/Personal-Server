# Task: FitNotes Import Frontend Improvements

**Agent**: Development Agent 2
**Priority**: P0
**Estimated Effort**: 4h
**Depends On**: Task 01 (backend)

## Objective
Create a multi-step import wizard with preview, options, progress, and summary views.

## Repository
- **Path**: `/home/clawdia/.openclaw/workspace/Personal-Server`
- **Frontend**: `frontend/src/`

## Current Implementation
- File: `frontend/src/pages/Workout/WorkoutImport.jsx`
- Current flow: File select → Submit → Wait → Success/Error
- Problems: No preview, no progress, no summary

## Tasks

### 1. Multi-Step Wizard Component (2h)

Replace single-page form with a stepper wizard:

**Steps**:
1. **Select File** - File picker with drag & drop
2. **Preview** - Show what will be imported
3. **Options** - Toggle what to import, date filters
4. **Progress** - Real-time progress bar
5. **Summary** - Results with counts

```jsx
// New component structure
function WorkoutImportWizard() {
  const [step, setStep] = useState(1); // 1-5
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [options, setOptions] = useState({
    importCategories: true,
    importExercises: true,
    importSessions: true,
    importBodyweight: true,
    overwriteExisting: false,
  });
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  
  return (
    <>
      <StepIndicator current={step} steps={['File', 'Preview', 'Options', 'Import', 'Done']} />
      {step === 1 && <FileSelectStep />}
      {step === 2 && <PreviewStep />}
      {step === 3 && <OptionsStep />}
      {step === 4 && <ProgressStep />}
      {step === 5 && <SummaryStep />}
    </>
  );
}
```

### 2. Preview Step (1h)

After file upload, call `POST /workout/import/fitnotes/preview` and display:

```jsx
function PreviewStep({ preview }) {
  return (
    <div className="card">
      <h3>Import Preview</h3>
      
      <table>
        <thead>
          <tr><th>Type</th><th>Total</th><th>New</th><th>Existing</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Categories</td>
            <td>{preview.counts.categories.total}</td>
            <td className="text-green">{preview.counts.categories.new}</td>
            <td className="text-muted">{preview.counts.categories.existing}</td>
          </tr>
          {/* ... same for exercises, sessions, sets, bodyweight */}
        </tbody>
      </table>
      
      <div className="date-range">
        Data from {preview.dateRange.earliest} to {preview.dateRange.latest}
      </div>
      
      {preview.warnings.length > 0 && (
        <div className="alert-warning">
          {preview.warnings.map(w => <div key={w}>{w}</div>)}
        </div>
      )}
    </div>
  );
}
```

### 3. Progress Step with SSE (1h)

Connect to SSE endpoint and display real-time progress:

```jsx
function ProgressStep({ previewId, options, onComplete }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0 });
  
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/workout/import/fitnotes/execute/${previewId}?` + 
      new URLSearchParams(options)
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      if (data.stage === 'complete') {
        eventSource.close();
        onComplete(data.summary);
      }
    };
    
    return () => eventSource.close();
  }, [previewId]);
  
  return (
    <div className="card">
      <h3>Importing...</h3>
      <ProgressBar value={progress.progress} />
      <div className="stage-info">
        {progress.stage}: {progress.current}/{progress.total}
      </div>
    </div>
  );
}
```

### 4. Summary Step

Show final results with success/skip counts.

## Styling
- Use existing CSS variables from `frontend/src/styles.css`
- Match existing card/button styles
- Use Material Icons (already included)

## Deliverables
1. Refactored `WorkoutImport.jsx` with wizard flow
2. New reusable components: `StepIndicator`, `ProgressBar`
3. SSE connection handling
4. Responsive design for mobile
