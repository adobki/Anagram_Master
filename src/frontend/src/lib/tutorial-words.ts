/**
 * Every word the game's dictionary accepts from the letters of MASTER, two letters or more (294 of them),
 * for the offline tutorial (lib/tutorial-game.svelte.ts). Made once from the server's word list, so the
 * tutorial accepts and rejects exactly what a real game would. The six-letter ones use every letter.
 */
const LIST = `
ae am ar as at ea em er es et ma me mr ms mt ra re rm rs rt sa se sm sr st ta te tm tr ts aer aes aet ame amr
ams amt are arm ars art ase asm asr ast ate atm atr ats eam ear eas eat ema emr ems emt era ers ert esa esm
esr est eta etr ets mae mar mas mat mea mer mes met mra mre mrs msa mse msr mst mta mtr mts rae ram ras rat
rea rem res ret rma rms rsa rse rsm rta rte rtm rts sae sam sar sat sea sem ser set sma sme smr smt sra srm
sta ste stm str tae tam tar tas tea tem ter tes tma tmr tms tra trs tse tsm tsr amer ames ares aret arms arse
arsm arst arte arts asem aser asme asrm astm astr ates atms atrs ears east eats eras erat erma erst esma esra
esta etam etas etra maes mare mars mart mast mate mats mear meas meat mera mers mert mesa mest meta mets mrts
msae rame rams rase rate rats ream rema rems resa rest reta rets rmas rtse same sare sart sate seam sear seat
sera sert seta sram srta stam star stem ster stra stre tame tams tare tars tasm team tear teas tema tera term
tmrs tram tres trsa tsar arest armet aster astre mares marse marte marts maser mater mates mears meats meras
merat merta metas metra mster ramet rates reams reast resat retma rmats samer satem seram serta smart smear
stare steam stema strae stram tamer tames tares tarse teams tears teras terma terms trame trams treas trema
tresa armets martes maters matres ramets remast stream tamers
`

export const TUTORIAL_WORDS: readonly string[] = LIST.split(/\s+/).filter(Boolean)
