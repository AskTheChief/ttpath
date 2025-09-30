
export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service for TribeQuest</h1>
      <p className="mb-4 text-muted-foreground">Last updated: July 26, 2024</p>
      <p className="mb-6">
        Welcome to TribeQuest. By accessing or using our website and services, you agree to be bound by these Terms of Service and our Privacy Policy.
      </p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">1. Use of Our Service</h2>
          <p className="mb-4">
            You agree to use our service responsibly and in compliance with all applicable laws. You are responsible for any content you create or submit and for your interactions with other users. You must not use the service for any illegal or unauthorized purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">2. User Accounts</h2>
          <p className="mb-4">
            To access most features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account information (including your password) and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
            <h2 className="text-2xl font-semibold mb-2">3. User Conduct</h2>
            <p className="mb-4">
                You agree to not use the Service to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Post or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
                <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
                <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
            </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">4. Limitation of Liability</h2>
          <p className="mb-4">
            The Service is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the operation of the Service or the information, content, or materials included. To the fullest extent permissible by law, we disclaim all warranties. We will not be liable for any damages of any kind arising from the use of this site.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-2">5. Changes to These Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms of Service on this page and updating the "Last updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">6. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:support@ttpath.com" className="text-primary hover:underline">support@ttpath.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
