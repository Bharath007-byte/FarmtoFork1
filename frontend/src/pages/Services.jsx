import farmerImg from '../assets/farmer-produce.png';
import truckImg from '../assets/delivery-truck.png';
import farmTechImg from '../assets/farm-tech.png';

const services = [
  {
    id: 1,
    title: "Direct Farm Sourcing",
    description: "Hand-picked organic produce gathered straight from local farmers at fair prices, removing traditional middleman markups.",
    image: farmerImg
  },
  {
    id: 2,
    title: "Temperature-Controlled Delivery",
    description: "Custom refrigerated transport vans ensuring vegetables and fruits arrive fresh, crisp, and nutrient-dense.",
    image: truckImg
  },
  {
    id: 3,
    title: "Smart Sustainable Farming",
    description: "Deploying solar energy and precision tech to minimize water usage, optimize crop yield, and protect soil health.",
    image: farmTechImg
  }
];

export default function Services() {
  return (
    <div id="services" className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">What We Offer</span>
          <h2 className="text-4xl font-extrabold text-slate-900 mt-2 mb-4">Our End-to-End Services</h2>
          <p className="text-slate-600">
            From smart harvesting in the fields to refrigerated logistics, we ensure quality at every stage.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="h-56 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-cover hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{service.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}