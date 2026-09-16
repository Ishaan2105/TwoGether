export default function LoadingSpinner({ full = false }) {
  return (
    <div className={full ? 'spinner-wrap spinner-wrap--full' : 'spinner-wrap'}>
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}