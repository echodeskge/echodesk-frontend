import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pricingModel, setPricingModel] = useState<'agent' | 'crm'>('agent');

  const agentBasedPackages = [
    {
      id: 1,
      name: "Essential",
      price: "5₾",
      period: "per agent/month",
      description: "Basic ticket management and communication tools for small teams",
      features: [
        "Complete Ticket Management System",
        "Email Integration",
        "Basic Reporting",
        "Team Collaboration",
        "Mobile App Access",
        "Up to 1,000 WhatsApp messages/month",
        "Email Support"
      ],
      highlight: false,
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      id: 2,
      name: "Professional",
      price: "15₾",
      period: "per agent/month",
      description: "Advanced features with SIP calling and social integrations",
      features: [
        "Everything in Essential",
        "Integrated SIP Phone System",
        "Call Recording & Analytics",
        "Facebook Messenger Integration",
        "Instagram DM Integration",
        "Up to 5,000 WhatsApp messages/month",
        "Advanced Workflows",
        "Priority Support"
      ],
      highlight: true,
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      id: 3,
      name: "Enterprise",
      price: "25₾",
      period: "per agent/month",
      description: "Complete omnichannel solution with WhatsApp and custom integrations",
      features: [
        "Everything in Professional",
        "WhatsApp Business API",
        "Up to 15,000 WhatsApp messages/month",
        "Custom Integrations",
        "Advanced Analytics Dashboard",
        "Multi-tenant Management",
        "API Access",
        "Dedicated Account Manager",
        "24/7 Premium Support"
      ],
      highlight: false,
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
  ];

  const crmBasedPackages = [
    {
      id: 4,
      name: "Startup",
      price: "79₾",
      period: "per month",
      description: "Perfect for small businesses with up to 5 users",
      features: [
        "Up to 5 Users",
        "Complete Ticket Management",
        "Email Integration",
        "Basic Reporting",
        "Mobile App Access",
        "Up to 2,000 WhatsApp messages/month",
        "Standard Support",
        "5GB Storage"
      ],
      highlight: false,
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      id: 5,
      name: "Business",
      price: "249₾",
      period: "per month",
      description: "Growing teams with advanced features and up to 25 users",
      features: [
        "Up to 25 Users",
        "Everything in Startup",
        "SIP Phone System",
        "Social Media Integration",
        "Advanced Workflows",
        "Call Recording",
        "Up to 10,000 WhatsApp messages/month",
        "Priority Support",
        "50GB Storage"
      ],
      highlight: true,
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      id: 6,
      name: "Corporate",
      price: "699₾",
      period: "per month",
      description: "Large organizations with up to 100 users and enterprise features",
      features: [
        "Up to 100 Users",
        "Everything in Business",
        "WhatsApp Business API",
        "Up to 50,000 WhatsApp messages/month",
        "Custom Integrations",
        "Advanced Analytics",
        "Multi-tenant Architecture",
        "Dedicated Account Manager",
        "Unlimited Storage",
        "Custom SLA Agreement"
      ],
      highlight: false,
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
  ];

  const packages = pricingModel === 'agent' ? agentBasedPackages : crmBasedPackages;

  const services = [
    {
      icon: "🎫",
      title: "Ticket Management",
      description:
        "Streamline your customer support with our advanced ticket management system featuring kanban boards, automated workflows, and team collaboration tools.",
    },
    {
      icon: "📞",
      title: "SIP Integration",
      description:
        "Make and receive calls directly from your CRM with our integrated SIP phone system, complete with call recording and advanced routing.",
    },
    {
      icon: "💬",
      title: "Social Messaging",
      description:
        "Connect with customers on Facebook, Instagram, and WhatsApp. Manage all conversations from one unified inbox.",
    },
    {
      icon: "📊",
      title: "Analytics & Reporting",
      description:
        "Get deep insights into your customer support performance with comprehensive analytics and customizable reports.",
    },
    {
      icon: "🔄",
      title: "Multi-Tenant Architecture",
      description:
        "Secure, scalable architecture that allows multiple organizations to use the platform with complete data isolation.",
    },
    {
      icon: "🌐",
      title: "API Integration",
      description:
        "Extensive API access allows you to integrate EchoDesk with your existing tools and build custom solutions.",
    },
  ];

  return (
    <div
      style={{ fontFamily: "Uni Neue, system-ui, -apple-system, sans-serif" }}
    >
      {/* Hero Section */}
      <div
        style={{
          minHeight: "100vh",
          background: "#2A2B7C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px" }}>
          <h1
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
              fontWeight: "700",
              fontStyle: "oblique",
              fontFamily: "Uni Neue, system-ui, -apple-system, sans-serif",
            }}
          >
            <span style={{ color: "white" }}>Echo</span>
            <span style={{ color: "#2FB282" }}>Desk</span>
          </h1>
          <p
            style={{
              fontSize: "1.5rem",
              marginBottom: "2rem",
              opacity: 0.9,
            }}
          >
            Complete Customer Support Platform
          </p>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "3rem",
              opacity: 0.8,
            }}
          >
            Unify your customer communications with tickets, calls, and social
            messaging in one powerful platform. Built for teams who want to
            deliver exceptional customer experiences.
          </p>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="#packages"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                padding: "15px 30px",
                borderRadius: "50px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "1.1rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              View Pricing
            </a>
            <Link
              href="/register"
              style={{
                background: "white",
                color: "#667eea",
                padding: "15px 30px",
                borderRadius: "50px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "1.1rem",
                transition: "transform 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div
        style={{
          padding: "80px 20px",
          backgroundColor: "#f8fafc",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
              color: "#1e293b",
              fontWeight: "700",
            }}
          >
            Everything You Need for Customer Support
          </h2>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#64748b",
              marginBottom: "4rem",
              maxWidth: "600px",
              margin: "0 auto 4rem auto",
            }}
          >
            Our comprehensive platform brings together all the tools your team
            needs to provide exceptional customer service.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "30px",
              marginTop: "3rem",
            }}
          >
            {services.map((service, index) => (
              <div
                key={index}
                style={{
                  background: "white",
                  padding: "30px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
                  textAlign: "left",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(0, 0, 0, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px rgba(0, 0, 0, 0.05)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>
                  {service.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.3rem",
                    marginBottom: "10px",
                    color: "#1e293b",
                    fontWeight: "600",
                  }}
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    lineHeight: "1.6",
                    fontSize: "1rem",
                  }}
                >
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div
        id="packages"
        style={{
          padding: "80px 20px",
          backgroundColor: "white",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
              color: "#1e293b",
              fontWeight: "700",
            }}
          >
            Choose Your Perfect Plan
          </h2>
          
          {/* Pricing Model Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem',
            gap: '10px'
          }}>
            <button
              onClick={() => setPricingModel('agent')}
              style={{
                padding: '12px 24px',
                borderRadius: '50px',
                border: '2px solid #2A2B7C',
                background: pricingModel === 'agent' ? '#2A2B7C' : 'transparent',
                color: pricingModel === 'agent' ? 'white' : '#2A2B7C',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Agent-Based Pricing
            </button>
            <button
              onClick={() => setPricingModel('crm')}
              style={{
                padding: '12px 24px',
                borderRadius: '50px',
                border: '2px solid #2A2B7C',
                background: pricingModel === 'crm' ? '#2A2B7C' : 'transparent',
                color: pricingModel === 'crm' ? 'white' : '#2A2B7C',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              CRM-Based Pricing
            </button>
          </div>
          
          <p
            style={{
              fontSize: '1rem',
              color: '#64748b',
              marginBottom: '1rem',
              fontStyle: 'italic'
            }}
          >
            {pricingModel === 'agent' 
              ? 'Pay per agent - perfect for teams that want predictable scaling costs'
              : 'Fixed pricing with user limits - ideal for organizations with defined team sizes'
            }
          </p>
          
          <p
            style={{
              fontSize: "1.2rem",
              color: "#64748b",
              marginBottom: "4rem",
              maxWidth: "600px",
              margin: "0 auto 4rem auto",
            }}
          >
            Scale up as your business grows. All plans include our core features
            with increasing levels of integration and support.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "30px",
              marginTop: "3rem",
            }}
          >
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background: pkg.highlight
                    ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    : "white",
                  color: pkg.highlight ? "white" : "#1e293b",
                  padding: "40px 30px",
                  borderRadius: "16px",
                  boxShadow: pkg.highlight
                    ? "0 20px 40px rgba(240, 147, 251, 0.3)"
                    : "0 4px 6px rgba(0, 0, 0, 0.05)",
                  border: pkg.highlight ? "none" : "2px solid #e2e8f0",
                  position: "relative",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  transform:
                    hoveredCard === pkg.id
                      ? "translateY(-10px)"
                      : "translateY(0)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredCard(pkg.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {pkg.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-15px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      padding: "8px 24px",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "10px",
                    fontWeight: "700",
                  }}
                >
                  {pkg.name}
                </h3>

                <div style={{ marginBottom: "20px" }}>
                  <span
                    style={{
                      fontSize: "3rem",
                      fontWeight: "700",
                    }}
                  >
                    {pkg.price}
                  </span>
                  <span
                    style={{
                      fontSize: "1rem",
                      opacity: 0.8,
                    }}
                  >
                    /{pkg.period}
                  </span>
                </div>

                <p
                  style={{
                    marginBottom: "30px",
                    opacity: 0.9,
                    lineHeight: "1.5",
                  }}
                >
                  {pkg.description}
                </p>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    marginBottom: "30px",
                    textAlign: "left",
                  }}
                >
                  {pkg.features.map((feature, index) => (
                    <li
                      key={index}
                      style={{
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.95rem",
                      }}
                    >
                      <span
                        style={{
                          marginRight: "12px",
                          color: pkg.highlight ? "white" : "#10b981",
                          fontSize: "1.2rem",
                        }}
                      >
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  style={{
                    display: "inline-block",
                    width: "100%",
                    padding: "15px 0",
                    background: pkg.highlight
                      ? "rgba(255, 255, 255, 0.2)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: pkg.highlight ? "white" : "white",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "1rem",
                    border: pkg.highlight
                      ? "2px solid rgba(255, 255, 255, 0.3)"
                      : "none",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = pkg.highlight
                      ? "rgba(255, 255, 255, 0.3)"
                      : "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = pkg.highlight
                      ? "rgba(255, 255, 255, 0.2)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div
        style={{
          padding: "80px 20px",
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
              fontWeight: "700",
            }}
          >
            Ready to Transform Your Customer Support?
          </h2>
          <p
            style={{
              fontSize: "1.2rem",
              marginBottom: "3rem",
              opacity: 0.9,
              lineHeight: "1.6",
            }}
          >
            Join thousands of businesses who trust EchoDesk to deliver
            exceptional customer experiences. Start your free trial today and
            see the difference our platform can make.
          </p>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/register"
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                padding: "18px 36px",
                borderRadius: "50px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "1.1rem",
                transition: "transform 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "translateY(-3px)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              Start Free Trial
            </Link>
            <a
              href="mailto:support@echodesk.ge"
              style={{
                background: "transparent",
                color: "white",
                padding: "18px 36px",
                borderRadius: "50px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "1.1rem",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "40px 20px",
          backgroundColor: "#0f172a",
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.9rem" }}>
            © 2025 EchoDesk. All rights reserved. | Built with ❤️ for
            exceptional customer support teams.
          </p>
        </div>
      </div>
    </div>
  );
}
