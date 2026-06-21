// fyp-frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import AdminDashboard from "./Pages/Admindashboard";
import GroupApprovals from './Pages/Admin/GroupApprovals';
import PublicEvaluationPage from './Pages/PublicEvaluationPage';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';


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

        {/* Public Evaluation Route */}
        <Route path="/evaluate/:token" element={<PublicEvaluationPage />} />

        {/* ✅ Admin Group Approvals Route - FIXED */}
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
            <ProtectedRoute allowedTypes={['admin']}>
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