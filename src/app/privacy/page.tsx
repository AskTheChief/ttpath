
export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy for TribeQuest</h1>
      <p className="mb-4 text-muted-foreground">Last updated: July 26, 2024</p>
      <p className="mb-6">
        This Privacy Policy describes how your personal information is collected, used, and shared when you use the TribeQuest application (the "Service"). This policy is written to be compliant with the Google API Services User Data Policy.
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. Information We Collect</h2>
          <p className="mb-4">
            When you register for an account using Google Sign-In, we access and store the following information from your Google account:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Email Address:</strong> We use your email address as a unique identifier for your account.</li>
          </ul>
          <p>
            We also collect information you voluntarily provide through your use of the Service, such as your progress on the path, tutorial answers, and any feedback you submit.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>To Provide and Maintain the Service:</strong> To create and manage your account, save your progress, and personalize your experience.</li>
            <li><strong>To Communicate With You:</strong> To respond to your feedback and support requests. If you provide your email with feedback, we may use it to contact you regarding that feedback.</li>
            <li><strong>To Improve Our Service:</strong> To analyze usage patterns and improve the functionality and user experience of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">3. Sharing Your Personal Information</h2>
          <p className="mb-4">
            <strong>We do not share, sell, or rent your personal Google user data with any third parties.</strong> Your data is used solely for the functioning of the TribeQuest application.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">4. Data Storage and Security</h2>
          <p className="mb-4">
            Your data, including your email address and application progress, is securely stored using Google's Firebase services (Firestore and Firebase Authentication). We rely on Google's robust security measures to protect your data. Access to data is restricted by Firebase Security Rules to only allow you to access your own data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">5. Data Retention and Deletion</h2>
          <p className="mb-4">
            We retain your personal information for as long as your account is active. You have the right to request the deletion of your account and all associated data at any time.
          </p>
          <p>
            To delete your data, please send an email to <a href="mailto:support@mail.ttpath.net" className="text-primary hover:underline">support@mail.ttpath.net</a> with the subject line "Data Deletion Request" from the email address associated with your account. We will permanently delete your account and all related data from our systems within 30 days.
          </p>
        </section>

        <section>
            <h2 className="text-2xl font-semibold mb-2">6. Limited Use Disclosure</h2>
            <p>
                TribeQuest's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#limited_use_requirements" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">7. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this privacy policy from time to time to reflect changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes by posting the new policy on this page.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">8. Contact Us</h2>
          <p>
            If you have any questions about our privacy practices or if you have any questions, please contact us by email at <a href="mailto:support@mail.ttpath.net" className="text-primary hover:underline">support@mail.ttpath.net</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
