import React from 'react'
import { Navigate, useRoutes } from 'react-router-dom'

import { authRoutes } from 'modules/auth'
import { jobsRoutes } from 'modules/jobs'
import { osUsersRoutes } from './modules/osUsers'

export const App = () => {
  const element = useRoutes([
    ...authRoutes,
    ...jobsRoutes,
    ...osUsersRoutes,
    {
      element: <Navigate to={'/login'} />,
      path: '/',
    },
  ])
  return element
}
