import { Link }       from 'react-router-dom';
import { Upload, BookOpen, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';
import useAuthStore from '../../store/authStore.js';

const QuickCard = ({ icon: Icon, title, desc, to, iconStyle }) => (
  <Link to={to} className="card group cursor-pointer">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
      style={iconStyle}>
      <Icon size={17} />
    </div>
    <div className="font-semibold text-sm mb-0.5" style={{ color: '#18181B' }}>{title}</div>
    <div className="text-xs" style={{ color: '#78716C' }}>{desc}</div>
  </Link>
);

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-0.5" style={{ color: '#18181B', letterSpacing: '-0.025em' }}>
          {greeting}, {user?.firstName}! 👋
        </h1>
        <p className="text-sm" style={{ color: '#78716C' }}>
          Semester {user?.semester} · {user?.departmentId?.name ?? 'Your Department'}
        </p>
      </div>

      {/* Hero CTA */}
      <div className="rounded-2xl p-6 mb-7 flex items-center justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #141417 0%, #1A1A1F 50%, #1E1E24 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <div className="text-white font-semibold text-lg mb-1">Share your notes</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Help your classmates by uploading study material
          </div>
        </div>
        <Link to="/student/upload"
          className="relative z-10 flex items-center gap-1.5 font-semibold text-sm px-4 py-2 rounded-xl
                     transition-all duration-200 hover:scale-[1.03] shrink-0"
          style={{
            background: 'linear-gradient(135deg, #D97706, #B45309)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(180,83,9,0.4)',
          }}>
          Upload Now <ArrowRight size={13} />
        </Link>
      </div>

      {/* Quick action grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickCard icon={BookOpen}
          title="Browse Notes"
          desc="Find study material"
          to="/student/notes"
          iconStyle={{ background: '#DBEAFE', color: '#1D4ED8' }} />
        <QuickCard icon={Upload}
          title="Upload Note"
          desc="Share with class"
          to="/student/upload"
          iconStyle={{ background: '#D1FAE5', color: '#065F46' }} />
        <QuickCard icon={Briefcase}
          title="Opportunities"
          desc="Jobs & internships"
          to="/student/jobs"
          iconStyle={{ background: '#FEF3C7', color: '#92400E' }} />
        <QuickCard icon={GraduationCap}
          title="Mentorship"
          desc="Connect with alumni"
          to="/student/mentorship"
          iconStyle={{ background: '#F3E8FF', color: '#6B21A8' }} />
      </div>
    </div>
  );
};

export default StudentDashboard;
