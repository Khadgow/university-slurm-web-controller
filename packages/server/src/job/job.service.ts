import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClusterService } from '../cluster/cluster.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobService {
  constructor(
    private prisma: PrismaService,
    private clusterService: ClusterService,
  ) {}

  getLocalclusterJobs() {
    return this.prisma.localclusterJob.findMany({});
  }

  async findByClusterName(name: string) {
    const res = await this.clusterService.findOne(name);
    if (res) {
      const tableName = `${name}_job_table`;
      return this.prisma
        .$queryRaw`SELECT job_db_inx as "id", job_name as "jobName", state, account, id_user as "userId" FROM ${Prisma.raw(
        tableName,
      )}`;
    }
    return null;
  }
}
