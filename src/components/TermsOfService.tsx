'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p className="text-sm text-gray-500 mb-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using EchoDesk ("the Service"), you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to these Terms of Service, please do not
              use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              EchoDesk provides a comprehensive customer support and communication platform that enables
              businesses to manage customer interactions, support tickets, and communication channels.
              The Service may include various features such as messaging, call management, analytics,
              and integration capabilities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <p className="mb-3">
              To use certain features of the Service, you must register for an account. When you register,
              you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept all responsibility for activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
            <p className="mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purposes or in violation of any laws</li>
              <li>Transmit any harmful code, viruses, or malicious software</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without our permission</li>
              <li>Resell, duplicate, or exploit any portion of the Service without permission</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Subscription and Payment</h2>
            <p className="mb-3">
              EchoDesk offers various subscription plans with different features and pricing:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law or as stated in our <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link></li>
              <li>We reserve the right to modify our pricing with 30 days notice</li>
              <li>Failure to pay fees may result in suspension or termination of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Data Privacy and Security</h2>
            <p>
              We take the privacy and security of your data seriously. Your use of the Service is also
              governed by our Privacy Policy. We implement industry-standard security measures to protect
              your data, but cannot guarantee absolute security. You are responsible for maintaining the
              confidentiality of your data and access credentials.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by EchoDesk
              and are protected by international copyright, trademark, patent, trade secret, and other
              intellectual property laws. You may not copy, modify, distribute, sell, or lease any part
              of our Service without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Service Availability</h2>
            <p className="mb-3">
              We strive to provide reliable service, but we do not guarantee that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li>The results obtained from using the Service will be accurate or reliable</li>
              <li>Any errors in the Service will be corrected</li>
            </ul>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue the Service at any time
              with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without
              prior notice or liability, for any reason, including breach of these Terms. Upon termination,
              your right to use the Service will immediately cease. All provisions of the Terms which by
              their nature should survive termination shall survive, including ownership provisions,
              warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, EchoDesk shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other
              intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind,
              either express or implied, including but not limited to warranties of merchantability, fitness
              for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which EchoDesk operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material,
              we will provide at least 30 days notice prior to any new terms taking effect. What constitutes
              a material change will be determined at our sole discretion. By continuing to access or use
              our Service after revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 pl-4">
              <p>Email: <a href="mailto:legal@echodesk.com" className="text-blue-600 hover:underline">legal@echodesk.com</a></p>
              <p>Support: <a href="mailto:support@echodesk.com" className="text-blue-600 hover:underline">support@echodesk.com</a></p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </section>

          <section className="border-t pt-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Policies</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/refund-policy" className="text-blue-600 hover:underline">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
