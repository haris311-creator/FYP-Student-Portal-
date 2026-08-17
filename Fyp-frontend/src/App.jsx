// fyp-frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/Homepage';
import Login from './pages/Login';
import StudentDashboard from './pages/Studentdashboard';
import SupervisorDashboard from './pages/Supervisordashboard';
import AdminDashboard from './pages/Admin/Admindashboard';
import GroupApprovals from './pages/Admin/GroupApprovals';
import PublicEvaluationPage from './pages/PublicEvaluationPage';
import PublicTitleDefensePage from './pages/PublicTitleDefensePage';
import StudentRegistration from './pages/StudentRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Route Guards
import ProtectedRoute from './guards/ProtectedRoute';
import AdminRoute from './guards/AdminRoute';


function App() {
  return (
    <Router>
      {/* Navbar sabhi pages pe dikhayega */}
      <Navbar />

      <Routes>
        {/* Home Route */}
        <Route path="/" element={<HomePage />} />
        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* Registration Route */}
        <Route path="/register" element={<StudentRegistration />} />

        {/* Public Evaluation Route */}
        <Route path="/evaluate/td/:token" element={<PublicTitleDefensePage />} />
        <Route path="/evaluate/:token" element={<PublicEvaluationPage />} />

        {/*  Admin Group Approvals Route - FIXED */}
        <Route
          path="/admin/approvals"
          element={
            <AdminRoute>
              <GroupApprovals />
            </AdminRoute>
          }
        />

        {/* Protected Dashboards */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedTypes={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor-dashboard"
          element={
            <ProtectedRoute allowedTypes={['supervisor']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedTypes={['admin','committee']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Footer sabhi pages pe dikhayega */}
      <Footer />
    </Router>
  );
}

export default App;