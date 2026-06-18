import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import {
  AddMemberDto,
  UpdateOrganizationDto,
  UpdatePayoutDto,
  UpdateMemberRoleDto,
} from './dto/create-organization.dto';

@ApiTags('Organizations')
@ApiCookieAuth('session')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get my organisation',
    description:
      'Returns the organisation the authenticated vendor belongs to.',
  })
  @ApiResponse({ status: 200, description: 'Organisation record' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getMyOrganization(@Actor() actor: ActorContext) {
    return this.orgsService.getMyOrganization(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organisation by ID' })
  @ApiParam({ name: 'id', example: 'org_01abc' })
  @ApiResponse({ status: 200, description: 'Organisation record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getOrganization(@Param('id') id: string) {
    return this.orgsService.getOrganizationById(id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update my organisation',
    description:
      'Updates store profile including availability, delivery options, and prep time.',
  })
  @ApiResponse({ status: 200, description: 'Updated organisation' })
  updateOrganization(
    @Actor() actor: ActorContext,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.updateOrganization(actor, dto);
  }

  @Patch('me/payout')
  @ApiOperation({
    summary: 'Update payout settings',
    description: 'Set mobile money or bank account details for vendor payouts.',
  })
  @ApiResponse({ status: 200, description: 'Updated payout settings' })
  updatePayout(@Actor() actor: ActorContext, @Body() dto: UpdatePayoutDto) {
    return this.orgsService.updatePayout(actor, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete my organisation' })
  @ApiResponse({ status: 200, description: 'Organisation deleted' })
  deleteOrganization(@Actor() actor: ActorContext) {
    return this.orgsService.deleteOrganization(actor);
  }

  @Get('me/members')
  @ApiOperation({ summary: 'List organisation members' })
  @ApiResponse({ status: 200, description: 'Array of members' })
  getMembers(@Actor() actor: ActorContext) {
    return this.orgsService.getMembers(actor);
  }

  @Post('me/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to the organisation by email' })
  @ApiResponse({ status: 201, description: 'Added member' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  addMember(@Actor() actor: ActorContext, @Body() dto: AddMemberDto) {
    return this.orgsService.addMember(actor, dto);
  }

  @Patch('me/members/:memberId/role')
  @ApiOperation({
    summary: 'Update member role',
    description: 'Promote or demote a member between admin and member roles.',
  })
  @ApiParam({ name: 'memberId', example: 'member_01abc' })
  @ApiResponse({ status: 200, description: 'Updated member' })
  updateMemberRole(
    @Actor() actor: ActorContext,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(actor, memberId, dto);
  }

  @Delete('me/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the organisation' })
  @ApiParam({ name: 'memberId', example: 'member_01abc' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(
    @Actor() actor: ActorContext,
    @Param('memberId') memberId: string,
  ) {
    return this.orgsService.removeMember(actor, memberId);
  }

  @Get('me/invitations')
  @ApiOperation({ summary: 'List pending invitations for my organisation' })
  @ApiResponse({ status: 200, description: 'Array of invitations' })
  getInvitations(@Actor() actor: ActorContext) {
    return this.orgsService.getInvitations(actor);
  }
}
