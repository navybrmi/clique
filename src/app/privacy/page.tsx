export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 prose dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        Clique respects your privacy. This policy explains what data we
        collect, how we use it, and your rights.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>
          Account information from OAuth providers (name, email, profile image,
          and provider user ID) to create and maintain your account.
        </li>
        <li>
          Recommendation content you create (titles, descriptions, categories).
        </li>
        <li>
          Basic technical data for functionality and security (IP address, user
          agent, and timestamps).
        </li>
      </ul>

      <h2>How We Use Information</h2>
      <ul>
        <li>To authenticate you and provide access to the app.</li>
        <li>To show, share, and manage your recommendations.</li>
        <li>To maintain service reliability, security, and prevent abuse.</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>
        We do not sell your data. We may share data with service providers
        strictly to operate the application (e.g., hosting, database, and
        authentication), following appropriate safeguards.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain data as long as necessary to provide the service. You may
        request deletion of your account and associated data by contacting us.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may access, update, or delete your data. For requests, contact the
        support email below.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy inquiries, contact: <a href="mailto:privacy@clique.app">privacy@clique.app</a>
        (replace with your actual email).
      </p>

      <h2>Updates</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        reflected on this page.
      </p>
    </div>
  )
}
