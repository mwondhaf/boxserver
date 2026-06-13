import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  UpdateOrganizationDto,
  UpdatePayoutDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  getMyOrganization(@Actor() actor: ActorContext) {
    return this.orgsService.getMyOrganization(actor);
  }

  @Get(':id')
  getOrganization(@Param('id') id: string) {
    return this.orgsService.getOrganizationById(id);
  }

  @Patch('me')
  updateOrganization(
    @Actor() actor: ActorContext,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.updateOrganization(actor, dto);
  }

  @Patch('me/payout')
  updatePayout(@Actor() actor: ActorContext, @Body() dto: UpdatePayoutDto) {
    return this.orgsService.updatePayout(actor, dto);
  }

  @Delete('me')
  deleteOrganization(@Actor() actor: ActorContext) {
    return this.orgsService.deleteOrganization(actor);
  }

  @Get('me/members')
  getMembers(@Actor() actor: ActorContext) {
    return this.orgsService.getMembers(actor);
  }

  @Patch('me/members/:memberId/role')
  updateMemberRole(
    @Actor() actor: ActorContext,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(actor, memberId, dto);
  }

  @Delete('me/members/:memberId')
  removeMember(
    @Actor() actor: ActorContext,
    @Param('memberId') memberId: string,
  ) {
    return this.orgsService.removeMember(actor, memberId);
  }

  @Get('me/invitations')
  getInvitations(@Actor() actor: ActorContext) {
    return this.orgsService.getInvitations(actor);
  }
}
