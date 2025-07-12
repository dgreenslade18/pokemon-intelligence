export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            <p className="text-gray-700">
              Pokemon Intelligence collects only the information necessary to provide card arbitrage analysis services. 
              This may include eBay account information when you connect your eBay account for enhanced functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>Provide Pokemon card arbitrage analysis</li>
              <li>Access eBay listings for price comparison</li>
              <li>Improve our service functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Security</h2>
            <p className="text-gray-700">
              We implement appropriate security measures to protect your information and do not store sensitive 
              authentication data beyond what is necessary for service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
            <p className="text-gray-700">
              This application integrates with eBay's API to provide market data. Your use of eBay integration 
              is subject to eBay's terms of service and privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
            <p className="text-gray-700">
              If you have questions about this privacy policy, please contact us through our application interface.
            </p>
          </section>

          <div className="text-sm text-gray-500 mt-8">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 