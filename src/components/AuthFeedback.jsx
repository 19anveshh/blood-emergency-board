export default function AuthFeedback({ error, success }) {
  if (error) {
    const message = typeof error === 'string' ? error : error.message || 'Please try again.'
    return <div className="auth-feedback auth-feedback-error" role="alert"><p>{message}</p>{error.details?.length > 0 && <ul>{error.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}</div>
  }
  return success ? <div className="auth-feedback auth-feedback-success" role="status"><p>{success}</p></div> : null
}
