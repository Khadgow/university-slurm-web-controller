import { useGetClustersQuery, useGetJobsByClusterNameQuery } from '../api'
import { useEffect, useState } from 'react'
import { Cluster } from '../models'
import { JobsTable } from '../components/JobsTable'
import { ClustersDrawer } from '../components/ClustersDrawer'
import { skipToken } from '@reduxjs/toolkit/query'

export const JobsList = () => {
  const [selectedCluster, setSelectedCluster] = useState<Cluster>()
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  const onClose = () => {
    setIsDrawerOpen(false)
  }
  const onOpen = () => {
    setIsDrawerOpen(true)
  }

  const onSelectCluster = (cluster: Cluster) => () => {
    setSelectedCluster(cluster)
  }

  const {
    data: clusters,
    isFetching: isClustersFetching,
    isSuccess,
  } = useGetClustersQuery(undefined, { pollingInterval: 60000 })

  const { data: jobs, isFetching: isJobsFetching } =
    useGetJobsByClusterNameQuery(selectedCluster?.name ?? skipToken)

  useEffect(() => {
    if (isSuccess && clusters.length && !selectedCluster) {
      setSelectedCluster(clusters[0])
    }
  }, [isSuccess, clusters, selectedCluster])

  const drawerWidth = 240

  return (
    <>
      <ClustersDrawer
        isOpen={isDrawerOpen}
        onClose={onClose}
        onOpen={onOpen}
        onSelectCluster={onSelectCluster}
        clusters={clusters}
        isLoading={isClustersFetching}
        drawerWidth={drawerWidth}
        selectedCluster={selectedCluster}
      />
      {/*style={{ marginLeft: isDrawerOpen ? drawerWidth : 0 }}*/}
      <div>
        <JobsTable jobs={jobs} isLoading={isJobsFetching} />
      </div>
    </>
  )
}
