import { useCopyManyDirectoriesMutation, useGetGroupsQuery } from '../api'
import { CopyManyDirectoriesRequest } from '../api/requests'

import { Box } from '@mui/material'
import { Loader } from 'components/Loader'
import { CopyManyDirectoriesForm } from '../components/CopyManyDirectoriesForm'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useEffect } from 'react'

export const CopyManyDirectories = () => {
  const [copyManyDirectories, { isSuccess, isLoading, isError, error }] =
    useCopyManyDirectoriesMutation()
  const navigate = useNavigate()

  const { data, isLoading: isGroupsLoading } = useGetGroupsQuery()

  const options = data?.map(({ id, name }) => ({ value: id, label: name }))

  const onSubmit = (values: CopyManyDirectoriesRequest) => {
    copyManyDirectories(values)
  }

  useEffect(() => {
    if (isError) {
      toast.error(error?.message)
    }
  }, [error, isError])

  useEffect(() => {
    if (isSuccess) {
      toast.success('Каталоги скопированы')
      navigate('/users')
    }
  }, [isSuccess, navigate])

  if (isLoading) {
    return <Loader />
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <h2>Копирование каталогов пользователей</h2>
      <CopyManyDirectoriesForm
        onSubmit={onSubmit}
        isOptionsLoading={isGroupsLoading}
        options={options}
      />
    </Box>
  )
}
