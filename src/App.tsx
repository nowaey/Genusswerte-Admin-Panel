import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Orders from '@/pages/Orders'
import OrderDetail from '@/pages/OrderDetail'
import OrderNew from '@/pages/OrderNew'
import Vouchers from '@/pages/Vouchers'
import VoucherDetail from '@/pages/VoucherDetail'
import Redemptions from '@/pages/Redemptions'
import RedemptionNew from '@/pages/RedemptionNew'
import RedemptionDetail from '@/pages/RedemptionDetail'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import StripeTest from '@/pages/StripeTest'
import Tastings from '@/pages/Tastings'
import TastingNew from '@/pages/TastingNew'
import TastingDetail from '@/pages/TastingDetail'
import GroupRequests from '@/pages/GroupRequests'
import GroupRequestDetail from '@/pages/GroupRequestDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index                        element={<Dashboard />} />
            <Route path="orders"               element={<Orders />} />
            <Route path="orders/new"           element={<OrderNew />} />
            <Route path="orders/:id"           element={<OrderDetail />} />
            <Route path="orders/:id/edit"      element={<OrderNew />} />
            <Route path="vouchers"             element={<Vouchers />} />
            <Route path="vouchers/:id"         element={<VoucherDetail />} />
            <Route path="redemptions"          element={<Redemptions />} />
            <Route path="redemptions/new"      element={<RedemptionNew />} />
            <Route path="redemptions/:id"      element={<RedemptionDetail />} />
            <Route path="customers"            element={<Customers />} />
            <Route path="customers/:id"        element={<CustomerDetail />} />
            <Route path="stripe-test"          element={<StripeTest />} />
            <Route path="tastings"             element={<Tastings />} />
            <Route path="tastings/new"         element={<TastingNew />} />
            <Route path="tastings/:id"         element={<TastingDetail />} />
            <Route path="group-requests"       element={<GroupRequests />} />
            <Route path="group-requests/:id"   element={<GroupRequestDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
