import { HttpException, Injectable } from '@nestjs/common';
import { CreateOsUserDto } from './dto/create-os-user.dto';
import { UpdateOsUserDto } from './dto/update-os-user.dto';
import { PrismaService } from '../prisma.service';
import { CreateManyOsUsersDto } from './dto/create-many-os-users.dto';
import { OsUserGroupsService } from '../os-user-groups/os-user-groups.service';
import { generate } from 'generate-password';
import { exec } from 'child_process';
import shellExec from 'shell-exec';
import * as process from 'process';
import { DeleteManyOsUsersDto } from './dto/delete-many-os-users.dto';
import { CopyManyDirectoriesDto } from './dto/copy-many-directories.dto';
import * as fs from 'fs/promises';
import * as fss from 'fs';

@Injectable()
export class OsUsersService {
  constructor(
    private prisma: PrismaService,
    private osUserGroupsService: OsUserGroupsService,
  ) {}

  create(createOsUserDto: CreateOsUserDto) {
    return this.prisma.osUser.create({ data: createOsUserDto });
  }

  async createMany(createManyOsUsersDto: CreateManyOsUsersDto) {
    const group = await this.osUserGroupsService.findByNameOrCreate(
      createManyOsUsersDto.groupName,
    );

    const maxGroupIndexUser = await this.prisma.osUser.findFirst({
      where: { groupId: group.id },
      orderBy: {
        groupIndex: 'desc',
      },
    });

    const maxUserId = await this.prisma.osUser.findFirst({
      orderBy: {
        id: 'desc',
      },
    });
    console.log('maxGroupIndexUser', maxGroupIndexUser);

    const maxGroupIndex = maxGroupIndexUser?.groupIndex || 0;
    // const maxGroupIndex = 0;

    const maxId = maxUserId?.id || Number(process.env.OS_USER_START_ID);
    // const maxId = 1004;

    const createdUsers = [];
    for (let i = 1; i < createManyOsUsersDto.quantity + 1; i++) {
      const userName = `${group.name}${maxGroupIndex + i}`;
      const userId = maxId + i;
      const password = generate({ length: 10, numbers: true });
      const createdUser = await this.prisma.osUser.create({
        data: {
          id: userId,
          groupIndex: maxGroupIndex + i,
          name: userName,
          groupId: group.id,
          password: password,
        },
      });
      const addOsUserCommand = `sudo useradd -m -u ${userId} ${userName}`;
      const changePasswordCommand = `echo "${userName}:${password}" | sudo chpasswd`;
      const addAccountCommand = `sudo sacctmgr -i add account ${userName}`;
      const addSlurmUserCommand = `sudo sacctmgr -i create user name=${userName} DefaultAccount=${userName}`;
      await this.shellExecWithLogging(addOsUserCommand);
      await this.shellExecWithLogging(changePasswordCommand);
      await this.shellExecWithLogging(addAccountCommand);
      await this.shellExecWithLogging(addSlurmUserCommand);
      createdUsers.push(createdUser);
    }

    return createdUsers;
  }
  async deleteMany(deleteManyOsUsersDto: DeleteManyOsUsersDto) {
    const group = await this.prisma.osUserGroup.findUnique({
      where: { id: deleteManyOsUsersDto.groupId },
    });
    if (!group) {
      throw new HttpException('Группа не найдена', 404);
    }
    for (
      let i = deleteManyOsUsersDto.startIndex;
      i < deleteManyOsUsersDto.endIndex;
      i++
    ) {
      const userName = `${group.name}${i}`;
      this.prisma.osUser.delete({
        where: {
          name: userName,
        },
      });
      await this.removeSlurmAccount(userName);
    }
  }

  async copyManyDirectories(copyManyDirectoriesDto: CopyManyDirectoriesDto) {
    const users = await this.prisma.osUser.findMany({
      where: { groupId: copyManyDirectoriesDto.groupId },
    });
    if (!users.length) {
      throw new HttpException('Пользователи не найдены', 404);
    }

    users.forEach(({ name }) => {
      this.copyUserDirectory(name);
    });
  }

  async copyDirectory(id: number) {
    const user = await this.prisma.osUser.findUnique({ where: { id } });
    await this.copyUserDirectory(user.name);
  }

  findAll() {
    return this.prisma.osUser.findMany();
  }

  findOne(id: number) {
    return this.prisma.osUser.findUnique({ where: { id } });
  }

  update(id: number, updateOsUserDto: UpdateOsUserDto) {
    return this.prisma.osUser.update({ data: updateOsUserDto, where: { id } });
  }

  async remove(id: number) {
    const user = await this.prisma.osUser.delete({ where: { id } });
    await this.removeSlurmAccount(user.name);
  }

  async removeSlurmAccount(name: string) {
    const deleteUserCommand = `sudo deluser --remove-home ${name}`;
    const deleteSlurmUserCommand = `sudo sacctmgr -i delete user name=${name}`;
    const deleteAccountCommand = `sudo sacctmgr -i delete account name=${name}`;
    await this.shellExecWithLogging(deleteUserCommand);
    await this.shellExecWithLogging(deleteSlurmUserCommand);
    await this.shellExecWithLogging(deleteAccountCommand);
  }

  async copyUserDirectory(name: string) {
    const filePath = `${process.env.DIRECTORY_FOR_COPY}${name}`;

    await fs.access(filePath).catch(async () => {
      await fs.mkdir(filePath, { recursive: true });
    });

    await fs.cp(`/home/${name}/`, filePath, {
      recursive: true,
      force: true,
      filter(source: string, destination: string): boolean | Promise<boolean> {
        console.log('source', source);
        const fileName = source.split('/').at(-1);
        if (fileName.startsWith('.')) {
          return false;
        }
        if (fss.lstatSync(source).isDirectory()) {
          return true;
        }
        const fileExtension = fileName.split('.').at(-1);
        return ['cpp', 'h', 'hpp', 'cu', 'cl'].includes(fileExtension);
      },
    });
  }

  async shellExecWithLogging(command: string) {
    const res = await shellExec(command);
    if (res.code !== 0) {
      await fs.appendFile(
        process.env.LOG_FILE,
        `[${new Date()}] ${res.stderr}`,
      );
      throw new HttpException(res.stderr, 500);
    }
  }
}
