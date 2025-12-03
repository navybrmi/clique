export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose dark:prose-invert">
      <h1>Data Deletion Instructions</h1>
      <p>
        If you would like to delete your data from Clique, please follow these instructions.
      </p>

      <h2>What Data We Store</h2>
      <p>
        When you sign in with Facebook, we store:
      </p>
      <ul>
        <li>Your name</li>
        <li>Your email address</li>
        <li>Your profile picture</li>
        <li>Your Facebook user ID</li>
        <li>Recommendations you create</li>
        <li>Comments and likes you make</li>
      </ul>

      <h2>How to Request Data Deletion</h2>
      <p>
        To request deletion of your data, please send an email to{" "}
        <a href="mailto:privacy@clique.app">privacy@clique.app</a> with the subject line
        "Data Deletion Request" and include:
      </p>
      <ul>
        <li>Your name</li>
        <li>The email address associated with your account</li>
        <li>Your Facebook user ID (if available)</li>
      </ul>

      <h2>What Happens Next</h2>
      <p>
        After we receive your request:
      </p>
      <ol>
        <li>We will confirm receipt of your request within 48 hours</li>
        <li>We will process your deletion request within 30 days</li>
        <li>All your personal data will be permanently removed from our systems</li>
        <li>You will receive a confirmation email once deletion is complete</li>
      </ol>

      <h2>Automatic Data Removal</h2>
      <p>
        Alternatively, if you revoke Clique's access through your Facebook settings,
        we will automatically remove your data within 90 days.
      </p>

      <h2>Questions</h2>
      <p>
        If you have any questions about data deletion, please contact{" "}
        <a href="mailto:privacy@clique.app">privacy@clique.app</a>.
      </p>
    </div>
  )
}
