"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p className="text-sm text-gray-500 mb-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
            <p className="mb-4">
              This Privacy Policy describes how EchoDesk ("we", "us", or "our")
              collects, uses, and shares your personal information when you use
              our service. This policy complies with the EU General Data
              Protection Regulation (GDPR) and other applicable data protection
              laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              1. Data Controller
            </h2>
            <p className="mb-3">
              EchoDesk is the data controller responsible for your personal
              information. You can contact us at:
            </p>
            <div className="pl-4 mb-3">
              <p>
                Email:{" "}
                <a
                  href="mailto:info@echodesk.ge"
                  className="text-blue-600 hover:underline"
                >
                  info@echodesk.ge
                </a>
              </p>
              <p>
                Phone:{" "}
                <a
                  href="tel:+995510003358"
                  className="text-blue-600 hover:underline"
                >
                  +995 (510) 003-358
                </a>
              </p>
              <p>
                Data Protection Officer:{" "}
                <a
                  href="mailto:info@echodesk.ge"
                  className="text-blue-600 hover:underline"
                >
                  info@echodesk.ge
                </a>
              </p>
              <p>Address: Shartava Street 55</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              2. Legal Basis for Processing
            </h2>
            <p className="mb-3">
              We process your personal data under the following legal bases:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contractual Necessity:</strong> To provide our services
                as outlined in our Terms of Service
              </li>
              <li>
                <strong>Consent:</strong> Where you have given explicit consent
                for specific processing activities
              </li>
              <li>
                <strong>Legitimate Interests:</strong> To improve our services,
                prevent fraud, and ensure security
              </li>
              <li>
                <strong>Legal Obligation:</strong> To comply with applicable
                laws and regulations
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              3. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
              3.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Account Information:</strong> Name, email address, phone
                number, company name
              </li>
              <li>
                <strong>Profile Information:</strong> Profile picture, job
                title, department
              </li>
              <li>
                <strong>Payment Information:</strong> Billing address, payment
                method details (processed by third-party payment processors)
              </li>
              <li>
                <strong>Communication Data:</strong> Messages, support tickets,
                feedback you provide
              </li>
              <li>
                <strong>Content:</strong> Any data you upload, share, or
                transmit through our service
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              3.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Usage Data:</strong> Features used, pages visited, time
                spent, interactions
              </li>
              <li>
                <strong>Device Information:</strong> IP address, browser type,
                operating system, device identifiers
              </li>
              <li>
                <strong>Log Data:</strong> Access times, error logs, performance
                data
              </li>
              <li>
                <strong>Cookies and Tracking:</strong> See our Cookie Policy
                section below
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              4. How We Use Your Information
            </h2>
            <p className="mb-3">
              We use your personal information for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Providing, maintaining, and improving our services</li>
              <li>Processing transactions and sending related information</li>
              <li>
                Sending administrative information, updates, and security alerts
              </li>
              <li>
                Responding to your comments, questions, and customer service
                requests
              </li>
              <li>Analyzing usage patterns to improve user experience</li>
              <li>
                Detecting, preventing, and addressing technical issues and
                security threats
              </li>
              <li>Complying with legal obligations and enforcing our terms</li>
              <li>
                Sending marketing communications (with your consent, where
                required)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              5. Data Sharing and Disclosure
            </h2>
            <p className="mb-3">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service Providers:</strong> Third-party vendors who
                perform services on our behalf (hosting, analytics, payment
                processing)
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with mergers,
                acquisitions, or asset sales
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights and safety
              </li>
              <li>
                <strong>With Your Consent:</strong> When you explicitly
                authorize us to share your data
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              6. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your own. When we transfer data outside the European
              Economic Area (EEA), we ensure appropriate safeguards are in
              place, such as:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>EU Standard Contractual Clauses</li>
              <li>Adequacy decisions by the European Commission</li>
              <li>Privacy Shield certification (where applicable)</li>
              <li>Other legally recognized transfer mechanisms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              7. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as necessary to
              fulfill the purposes outlined in this policy, unless a longer
              retention period is required or permitted by law. When determining
              retention periods, we consider:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>The nature and sensitivity of the data</li>
              <li>The purposes for which we process the data</li>
              <li>
                Legal, regulatory, tax, accounting, or reporting requirements
              </li>
              <li>Whether we can achieve our purposes through anonymization</li>
            </ul>
            <p className="mt-3">
              Upon account deletion, we will delete or anonymize your data
              within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              8. Your Rights Under GDPR
            </h2>
            <p className="mb-3">
              If you are in the European Economic Area, you have the following
              rights:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Right of Access:</strong> Request a copy of your
                personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Request correction of
                inaccurate data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your data
                ("right to be forgotten")
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Request
                limitation of data processing
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in
                a machine-readable format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent at
                any time (where processing is based on consent)
              </li>
              <li>
                <strong>Right to Lodge a Complaint:</strong> File a complaint
                with your local data protection authority
              </li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:info@echodesk.ge"
                className="text-blue-600 hover:underline"
              >
                info@echodesk.ge
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              9. Cookie Policy
            </h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to enhance your
              experience. Cookies are small data files stored on your device.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
              Types of Cookies We Use:
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for the service to
                function properly
              </li>
              <li>
                <strong>Performance Cookies:</strong> Help us understand how
                visitors use our service
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your preferences
                and settings
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Track your activity to
                deliver relevant advertisements (requires consent)
              </li>
            </ul>

            <p className="mt-3">
              You can control cookies through your browser settings. Note that
              disabling certain cookies may affect the functionality of our
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              10. Security Measures
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
              <li>Incident response and breach notification procedures</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet is 100%
              secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              11. Children's Privacy
            </h2>
            <p>
              Our service is not intended for individuals under the age of 16.
              We do not knowingly collect personal information from children. If
              you become aware that a child has provided us with personal
              information, please contact us, and we will take steps to delete
              such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              12. Third-Party Links
            </h2>
            <p>
              Our service may contain links to third-party websites. We are not
              responsible for the privacy practices of these external sites. We
              encourage you to read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              13. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any material changes by posting the new policy on
              this page and updating the "Last Updated" date. For significant
              changes, we will provide more prominent notice (such as email
              notification).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              14. Contact Us
            </h2>
            <p className="mb-3">
              If you have questions or concerns about this Privacy Policy or our
              data practices, please contact us:
            </p>
            <div className="pl-4">
              <p>
                Email:{" "}
                <a
                  href="mailto:info@echodesk.ge"
                  className="text-blue-600 hover:underline"
                >
                  info@echodesk.ge
                </a>
              </p>
              <p>
                Data Protection Officer:{" "}
                <a
                  href="mailto:info@echodesk.ge"
                  className="text-blue-600 hover:underline"
                >
                  info@echodesk.ge
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href="mailto:info@echodesk.ge"
                  className="text-blue-600 hover:underline"
                >
                  info@echodesk.ge
                </a>
              </p>
              <p>Phone: +995 (597) 147-515</p>
            </div>
          </section>

          <section className="border-t pt-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Related Policies
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-blue-600 hover:underline"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-blue-600 hover:underline"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
