package com.example.oide.settlement.controller;

import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.oide.global.exception.GlobalExceptionHandler;
import com.example.oide.settlement.service.SettlementService;
import com.example.oide.settlement.service.SettlementProgressService;

@ExtendWith(MockitoExtension.class)
class SettlementControllerTest {

	@Mock private SettlementService settlementService;
	@Mock private SettlementProgressService settlementProgressService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new SettlementController(
				settlementService, settlementProgressService))
				.setControllerAdvice(new GlobalExceptionHandler())
				.build();
	}

	@Test
	void completesMemberSettlementAndReturnsNoContent() throws Exception {
		mockMvc.perform(put("/api/rooms/1/settlements/members/2/completion")
				.header("X-Room-Member-Id", 2))
				.andExpect(status().isNoContent());

		then(settlementService).should().completeMemberSettlement(1L, 2L);
	}
}
