'use client';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Refund Policy</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p className="text-sm text-gray-500 mb-4">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Overview</h2>
            <p>
              Thank you for using EchoDesk. We strive to provide the best service possible.
              This refund policy outlines the terms and conditions under which refunds may be issued.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Refund Eligibility</h2>
            <p className="mb-3">
              You may be eligible for a refund under the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service outage or technical issues preventing access for more than 48 consecutive hours</li>
              <li>Billing errors or duplicate charges</li>
              <li>Cancellation within the first 14 days of initial subscription (pro-rated refund)</li>
              <li>Features advertised but not delivered as described</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Non-Refundable Items</h2>
            <p className="mb-3">
              The following are not eligible for refunds:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Partial month subscription fees</li>
              <li>Services already rendered or consumed</li>
              <li>Refund requests made after 30 days from the billing date</li>
              <li>Account termination due to violation of our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to Request a Refund</h2>
            <p className="mb-3">
              To request a refund, please follow these steps:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Contact our support team at <a href="mailto:support@echodesk.com" className="text-blue-600 hover:underline">support@echodesk.com</a></li>
              <li>Include your account details and invoice number</li>
              <li>Provide a detailed explanation of why you are requesting a refund</li>
              <li>Allow up to 5-7 business days for our team to review your request</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Refund Processing</h2>
            <p>
              Once your refund request is approved, it will be processed within 7-10 business days.
              Refunds will be issued to the original payment method used for the purchase. Please note
              that it may take additional time for your financial institution to process the refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Subscription Cancellations</h2>
            <p>
              If you cancel your subscription, you will continue to have access to the service until
              the end of your current billing period. No refunds will be provided for the remaining
              time in your billing cycle unless otherwise specified under our refund eligibility criteria.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Modifications to This Policy</h2>
            <p>
              We reserve the right to modify this refund policy at any time. Changes will be effective
              immediately upon posting to our website. Your continued use of EchoDesk after any changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p>
              If you have any questions about our refund policy, please contact us at:
            </p>
            <div className="mt-3 pl-4">
              <p>Email: <a href="mailto:support@echodesk.com" className="text-blue-600 hover:underline">support@echodesk.com</a></p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
